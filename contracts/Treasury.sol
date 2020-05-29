pragma solidity ^0.6.0;

import "./Miner.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum ProposalType { Mint, Access, Withdrawal }

enum AccessAction { Grant, Revoke }

struct Proposal {
    address who;
    uint256 expires;
    uint256 signatures;
    bool open;
    ProposalType proposalType;
}

struct MintProposal {
    uint256 amount;
}

struct WithdrawalProposal {
    address recipient;
    uint256 amount;
}

struct AccessProposal {
    address authority;
    AccessAction action;
}

struct Signatory {
    bool granted;
}

contract Treasury is Ownable {
    using SafeMath for uint;
    using SafeERC20 for Miner;

    Miner private _token;

    uint8 constant MINIMUM_AUTHORITIES = 3;

    mapping (address => Signatory) public signatories;
    address[] public signatoriesIndex;
    uint256 public grantedCount;

    mapping (uint256 => mapping(address => bool)) private _signatures;

    Proposal[] public proposals;
    mapping (uint256 => AccessProposal) public accessProposals;
    mapping (uint256 => MintProposal) public mintProposals;
    mapping (uint256 => WithdrawalProposal) public withdrawalProposals;

    constructor(Miner token) public {
        _token = token;
        _grantSignatory(_msgSender());
    }

    function inSigningPeriod() public view returns (bool) {
        if (proposals.length == 0) {
            return false;
        }

        uint i = proposals.length.sub(1);
        return _inSigningPeriod(i);
    }

    function _inSigningPeriod(uint256 i) private view returns (bool) {
        return proposals[i].expires > now;
    }

    /**
     * Proposes a minting event.
     * @param amount uint256 The proposed amount to mint.
     */
    function proposeMint(uint256 amount)
        public
        onlySignatory()
        miniumSignatories()
    {
        require(amount > 0, "Treasury/zero-amount");

        mintProposals[proposals.length] = MintProposal(amount);

        _propose(ProposalType.Mint);
    }

    /**
     * Proposes the granting of signatory based on their public address.
     * @param signatory address The address of the signatory to grant access
     * to.
     */
    function proposeGrant(address signatory)
        public
        onlySignatory()
        proposalPending()
    {
        require(signatory != address(0), "Treasury/invalid-address");
        require(!signatories[signatory].granted, "Treasury/access-granted");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(signatory, AccessAction.Grant);

        _propose(ProposalType.Access);
    }

    /**
     * Proposes the revoking of a signatory based on their public address.
     * @param signatory address The address of the signatory to revoke access
     * from.
     */
    function proposeRevoke(address signatory)
        public
        onlySignatory()
        proposalPending()
    {
        require(grantedCount > MINIMUM_AUTHORITIES, "Treasury/minimum-signatories");
        require(signatory != address(0), "Treasury/invalid-address");
        require(
            signatories[signatory].granted,
            "Treasury/no-signatory-or-revoked");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(signatory, AccessAction.Revoke);

        _propose(ProposalType.Access);
    }

    function proposeWithdrawal(address recipient, uint256 amount)
        public
        onlySignatory()
        proposalPending()
    {
        require(amount > 0, "Treasury/zero-amount");

        withdrawalProposals[proposals.length] = WithdrawalProposal(recipient, amount);

        _propose(ProposalType.Withdrawal);
    }

    function _propose(ProposalType proposalType)
        private
        onlySignatory()
        proposalPending()
        returns(uint256)
    {
        Proposal memory proposal =
            Proposal(
                msg.sender,
                now + 48 hours,
                0,
                true,
                proposalType);

        proposals.push(proposal);

        sign();
    }

    function getSignatoryCount() public view returns(uint256) {
        return signatoriesIndex.length;
    }

    /**
     * Gets the number of proposals.
     */
    function getProposalsCount() public view returns(uint256) {
        return proposals.length;
    }

    /**
     * Signs a proposal. If the required number of signatories is reached,
     * execute the appropriate proposal action.
     */
    function sign()
        public
        onlySignatory() {
        require(proposals.length > 0, "Treasury/no-proposals");
        uint256 index = getProposalsCount().sub(1);

        require(inSigningPeriod(), "Treasury/proposal-expired");
        require(proposals[index].open == true, "Treasury/proposal-closed");
        require(_signatures[index][msg.sender] != true, "Treasury/signatory-already-signed");

        _signatures[index][msg.sender] = true;
        proposals[index].signatures = proposals[index].signatures.add(1);
        emit Signed(index);

        if (proposals[index].signatures >= _getRequiredSignatoryCount()) {
            proposals[index].open = false;

            if (proposals[index].proposalType == ProposalType.Mint) {
                _printerGoesBrr(mintProposals[index].amount);
            } else if (proposals[index].proposalType == ProposalType.Withdrawal) {
                _withdraw(
                    withdrawalProposals[index].recipient,
                    withdrawalProposals[index].amount);
            } else {
                _updateSignatoryAccess();
            }
        }
    }

    function _getRequiredSignatoryCount() private view returns (uint256) {
        return grantedCount.sub(1);
    }

    function _updateSignatoryAccess() private {
        uint256 index = getProposalsCount().sub(1);
        // is this a new signatory?
        address signatory = accessProposals[index].authority;

        // don't re-add a signatory if they already have been granted access.
        if (!signatories[signatory].granted) {
            if (accessProposals[index].action == AccessAction.Grant) {
                _grantSignatory(signatory);

                emit AccessGranted(signatory);
            }
        } else {
            // only revoke signatory status if they have previously been granted access.
            if (accessProposals[index].action == AccessAction.Revoke) {
                signatories[signatory].granted = false;
                grantedCount = grantedCount.sub(1);

                emit AccessRevoked(signatory);
            }
        }
    }

    function _grantSignatory(address signatory) private {
        signatories[signatory] = Signatory(true);
        signatoriesIndex.push(signatory);
        grantedCount = grantedCount.add(1);
    }

    function _printerGoesBrr(uint256 amount) private {
        _token.mint(amount);
    }

    function _withdraw(address recipient, uint256 amount) private {
        _token.transfer(recipient, amount);
    }

    modifier onlySignatory() {
        require(signatories[msg.sender].granted == true, "Treasury/invalid-signatory");
        _;
    }

    modifier proposalPending() {
        uint256 totalProposals = getProposalsCount();

        if (totalProposals > 0) {
            uint256 index = totalProposals.sub(1);

            require(
                !proposals[index].open || !inSigningPeriod(),
                "Treasury/proposal-pending");
        }
        _;
    }

    modifier miniumSignatories() {
        require(grantedCount >= MINIMUM_AUTHORITIES, "Treasury/minimum-signatories");
        _;
    }

    event Signed(uint256 index);

    event AccessGranted(address signatory);
    event AccessRevoked(address signatory);

    event Withdrawn(uint256 amount);
}

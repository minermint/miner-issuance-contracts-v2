pragma solidity ^0.6.0;

import "./Miner.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum ProposalType { Mint, Access }

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
    uint256 public signatoryCount;

    mapping (uint256 => mapping(address => bool)) private _signatures;

    Proposal[] public proposals;
    mapping (uint256 => AccessProposal) public accessProposals;
    mapping (uint256 => MintProposal) public mintProposals;

    constructor(Miner token) public {
        _token = token;
        signatories[msg.sender] = Signatory(true);
        signatoryCount = signatoryCount.add(1);
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
        minimumSignatories()
    {
        require(amount > 0, "Amount must be greater than zero");

        mintProposals[proposals.length] = MintProposal(amount);

        _propose(ProposalType.Mint);
    }

    /**
     * Proposes the granting of signatory based on their public address.
     * @param authority address The address of the signatory to grant access
     * to.
     */
    function proposeGrant(address authority)
        public
        onlySignatory()
        proposalPending()
    {
        require(authority != address(0), "Invalid address");
        require(!signatories[authority].granted, "Access already granted");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(authority, AccessAction.Grant);

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
        minimumSignatories()
        proposalPending()
    {
        require(signatory != address(0), "Invalid address");
        require(
            signatories[signatory].granted,
            "Authority does not exist or has already been revoked");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(signatory, AccessAction.Revoke);

        _propose(ProposalType.Access);
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
        require(proposals.length > 0, "No proposals have been submitted");
        uint256 index = getProposalsCount().sub(1);

        require(inSigningPeriod(), "Proposal has expired");
        require(proposals[index].open == true, "Proposal is closed");
        require(_signatures[index][msg.sender] != true, "Signatory has already signed this proposal");

        _signatures[index][msg.sender] = true;
        proposals[index].signatures = proposals[index].signatures.add(1);
        emit Signed(index);

        if (proposals[index].signatures >= _getRequiredSignatoryCount()) {
            proposals[index].open = false;

            if (proposals[index].proposalType == ProposalType.Mint) {
                _printerGoesBrr(mintProposals[index].amount);
            } else {
                _updateSignatoryAccess();
            }
        }
    }

    function _getRequiredSignatoryCount() private view returns (uint256) {
        return signatoryCount.sub(1);
    }

    function _updateSignatoryAccess() private {
        uint256 index = getProposalsCount().sub(1);
        // is this a new signatory?
        address signatory = accessProposals[index].authority;

        // don't re-add a signatory if they already have been granted access.
        if (!signatories[signatory].granted) {
            if (accessProposals[index].action == AccessAction.Grant) {
                signatories[signatory] = Signatory(true);
                signatoryCount = signatoryCount.add(1);

                emit AccessGranted(signatory);
            }
        } else {
            // only revoke signatory status if they have previously been granted access.
            if (accessProposals[index].action == AccessAction.Revoke) {
                signatories[signatory].granted = false;
                signatoryCount = signatoryCount.sub(1);

                emit AccessRevoked(signatory);
            }
        }
    }

    function _printerGoesBrr(uint256 value) internal {
        _token.mint(value);
    }

    function withdraw(uint256 amount) public onlyOwner {
        _token.transfer(_msgSender(), amount);

        emit Withdrawn(amount);
    }

    modifier onlySignatory() {
        require(signatories[msg.sender].granted == true, "Sender is not a signatory");
        _;
    }

    modifier minimumSignatories() {
        require(signatoryCount >= MINIMUM_AUTHORITIES, "Minimum authorities not met");
        _;
    }

    modifier proposalPending() {
        uint256 totalProposals = getProposalsCount();

        if (totalProposals > 0) {
            uint256 index = totalProposals.sub(1);

            require(
                !proposals[index].open || !inSigningPeriod(),
                "Can not add a proposal while one is pending");
        }
        _;
    }

    event Signed(uint256 index);

    event AccessGranted(address signatory);
    event AccessRevoked(address signatory);

    event Withdrawn(uint256 amount);
}

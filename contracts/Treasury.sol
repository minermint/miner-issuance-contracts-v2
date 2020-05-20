pragma solidity ^0.6.0;

import "./Miner.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum TradeType { Buy, Sell }

enum ProposalType { Mint, Access }

enum AccessAction { Grant, Revoke }

struct Transaction {
    address who;
    TradeType trade;
    uint256 quantity;
    uint256 unitPrice;
    uint256 ethPrice;
    uint256 timeStamp;
}

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

    mapping (address => Signatory) public authorised;
    uint256 public authorisedCount;

    mapping (uint256 => mapping(address => bool)) private _signatures;

    mapping (address => uint256) private _balances;
    mapping (address => mapping (address => uint256)) private _allowed;
    mapping (address => uint256) private _tradeCount;

    Transaction[] public history;
    Proposal[] public proposals;
    mapping (uint256 => AccessProposal) public accessProposals;
    mapping (uint256 => MintProposal) public mintProposals;

    constructor(Miner token) public {
        _token = token;
        authorised[msg.sender] = Signatory(true);
        authorisedCount = authorisedCount.add(1);
    }

    function getTotalTradeCount() public view returns (uint256) {
        return history.length;
    }

    function getAccountTradeCount(address who) public view returns (uint256) {
        return _tradeCount[who];
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

    function getAccountTradesIndexs(address who) public view returns (uint256[] memory indexes) {
        uint256 j = 0;
        uint256 count = getAccountTradeCount(who);
        indexes = new uint256[](count);

        for (uint256 i; i < history.length; i++) {
            if (history[i].who == who) {
                 indexes[j] = i;
                 j++;
            }
        }

        return indexes;
    }

    /**
     * Proposes a minting event.
     * @param amount uint256 The proposed amount to mint.
     */
    function proposeMint(uint256 amount)
        public
        onlyAuthorised()
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
        onlyAuthorised()
        proposalPending()
    {
        require(authority != address(0), "Invalid address");
        require(!authorised[authority].granted, "Access already granted");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(authority, AccessAction.Grant);

        _propose(ProposalType.Access);
    }

    /**
     * Proposes the revoking of a signatory based on their public address.
     * @param authority address The address of the signatory to revoke access
     * from.
     */
    function proposeRevoke(address authority)
        public
        onlyAuthorised()
        minimumSignatories()
        proposalPending()
    {
        require(authority != address(0), "Invalid address");
        require(
            authorised[authority].granted,
            "Authority does not exist or has already been revoked");

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(authority, AccessAction.Revoke);

        _propose(ProposalType.Access);
    }

    function _propose(ProposalType proposalType)
        private
        onlyAuthorised()
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
        onlyAuthorised() {
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
                _mint(mintProposals[index].amount);
            } else {
                _updateSignatoryAccess();
            }
        }
    }

    function _getRequiredSignatoryCount() private returns (uint256) {
        return authorisedCount.sub(1);
    }

    function _updateSignatoryAccess() private {
        uint256 index = getProposalsCount().sub(1);
        // is this a new signatory?
        address signatory = accessProposals[index].authority;

        // don't re-add a signatory if they already have been granted access.
        if (!authorised[signatory].granted) {
            if (accessProposals[index].action == AccessAction.Grant) {
                authorised[signatory] = Signatory(true);
                authorisedCount = authorisedCount.add(1);

                emit AccessGranted(signatory);
            }
        } else {
            // only revoke signatory status if they have previously been granted access.
            if (accessProposals[index].action == AccessAction.Revoke) {
                authorised[signatory].granted = false;
                authorisedCount = authorisedCount.sub(1);

                emit AccessRevoked(signatory);
            }
        }
    }

    function _mint(uint256 value) internal {
        _token.mint(value);
    }

    function purchase(address to, uint256 value, uint256 unitPrice, uint256 ethPrice) public onlyAuthorised() {
        require(to != address(0), "Invalid address");
        require(value > 0, "Amount must be greater than zero");
        require(_balances[address(this)] >= value, "Can not buy more than the contract has");

        history.push(Transaction(to, TradeType.Sell, value, unitPrice, ethPrice, now));
        _tradeCount[to] = _tradeCount[to].add(1);
        _token.transfer(to, value);
    }

    modifier onlyAuthorised() {
        require(authorised[msg.sender].granted == true, "Sender is not a authorised");
        _;
    }

    modifier minimumSignatories() {
        require(authorisedCount >= MINIMUM_AUTHORITIES, "Minimum authorities not met");
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
}

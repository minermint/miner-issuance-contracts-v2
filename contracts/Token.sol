pragma solidity ^0.6.0;

import "./IERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";

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

contract Token is IERC20, Ownable {
    using SafeMath for uint;

    uint256 private _totalSupply;
    string private _name = "Miner";
    string private _symbol = "MNR";
    uint8 private _decimals = 4;

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

    constructor() public {
        authorised[msg.sender] = Signatory(true);
        authorisedCount = authorisedCount.add(1);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function getTotalTradeCount() public view returns (uint256) {
        return history.length;
    }

    function getAccountTradeCount(address who) public view returns (uint256) {
        return _tradeCount[who];
    }

    function inVotingPeriod() public view returns (bool) {
        if (proposals.length == 0) {
            return false;
        }

        uint i = proposals.length.sub(1);
        return _inVotingPeriod(i);
    }

    function _inVotingPeriod(uint256 i) private view returns (bool) {
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

    function balanceOf(address who) public view override returns (uint256) {
        return _balances[who];
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        require(msg.sender != address(this), "Contract itself can not send");
        _transfer(msg.sender, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "Invalid address");
        require(from != address(0), "Invalid address");
        require(_balances[from] >= value, "Insufficient funds");

        _balances[from] = _balances[from].sub(value);
        _balances[to] = _balances[to].add(value);

        emit Transfer(from, to, value);
    }

    function allowance(address tokenOwner, address spender) public view override returns (uint remaining) {
        return _allowed[tokenOwner][spender];
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(to != address(0), "Invalid address");
        require(from != address(this), "Cannot be contract address");

        _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);
        _transfer(from, to, value);

        emit Approval(from, msg.sender, _allowed[from][msg.sender]);
        return true;
    }

    function approve(address spender, uint256 value) public override returns (bool) {
        require(spender != address(0), "Invalid address");

        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * Proposes a minting event.
     * @params uint256 amount The proposed amount to mint.
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
     * @params address authority The address of the signatory to grant access
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
     * @params address authority The address of the signatory to revoke access
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

        require(inVotingPeriod(), "Proposal has expired");
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
        _totalSupply = _totalSupply.add(value);
        _balances[address(this)] = _balances[address(this)].add(value);

        emit Transfer(address(0), address(this), value);
    }

    function purchase(address to, uint256 value, uint256 unitPrice, uint256 ethPrice) public onlyAuthorised() {
        require(to != address(0), "Invalid address");
        require(value > 0, "Amount must be greater than zero");
        require(_balances[address(this)] >= value, "Can not buy more than the contract has");

        history.push(Transaction(to, TradeType.Sell, value, unitPrice, ethPrice, now));
        _tradeCount[to] = _tradeCount[to].add(1);
        _transfer(address(this), to, value);
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
                !proposals[index].open || !inVotingPeriod(),
                "Can not add a proposal while one is pending");
        }
        _;
    }

    event Signed(uint256 index);

    event AccessGranted(address signatory);
    event AccessRevoked(address signatory);
}

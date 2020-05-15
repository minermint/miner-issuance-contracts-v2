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
    uint256 count;
    uint256 required;
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

    mapping (uint256 => mapping(address => bool)) public signatures;

    mapping (address => uint256) private _balances;
    mapping (address => mapping (address => uint256)) private _allowed;
    mapping (address => uint256) private _tradeCount;

    Transaction[] public history;
    Proposal[] public proposals;
    mapping (uint256 => AccessProposal) public accessProposals;
    mapping (uint256 => MintProposal) public mintProposals;

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

    constructor() public {
        authorised[msg.sender] = Signatory(true);
        authorisedCount = authorisedCount.add(1);
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
        return proposals[i].expires > now && proposals[i].open;
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

    function proposeMint(uint256 amount)
        public
        onlyAuthorised()
        minimumSignatories()
    {
        require(amount > 0, "Amount must be greater than zero");

        mintProposals[proposals.length] = MintProposal(amount);
        propose(ProposalType.Mint);
    }

    function proposeGrant(address authority) public onlyAuthorised() {
        require(authority != address(0), "Invalid address");

        accessProposals[proposals.length] = AccessProposal(authority, AccessAction.Grant);

        propose(ProposalType.Access);
    }

    function proposeRevoke(address authority)
        public
        onlyAuthorised()
        minimumSignatories()
    {
        require(authority != address(0), "Invalid address");
        require(authorised[authority].granted, "Authority does not exist or has had authorisation already revoked");

        accessProposals[proposals.length] = AccessProposal(authority, AccessAction.Revoke);
        propose(ProposalType.Access);
    }

    function propose(ProposalType proposalType) internal onlyAuthorised() returns(uint256) {
        require(inVotingPeriod() == false, "Can not add a proposal while one is pending");

        uint256 required = authorisedCount.sub(1);
        Proposal memory proposal = Proposal(msg.sender, now + 48 hours, 0, required, true, proposalType);
        proposals.push(proposal);

        sign();
    }

    function getProposalLength() public view returns(uint256) {
        return proposals.length;
    }

    function sign() public onlyAuthorised() {
        require(proposals.length > 0, "No proposals have been submitted");
        uint256 index = proposals.length.sub(1);

        require(_inVotingPeriod(index), "Proposal has expired");
        require(proposals[index].open == true, "Proposal is closed");

        if (signatures[index][msg.sender] != true) {
            signatures[index][msg.sender] = true;
            proposals[index].count = proposals[index].count.add(1);
            emit Signed(index);

            if (proposals[index].count >= proposals[index].required) {
                proposals[index].open = false;

                if (proposals[index].proposalType == ProposalType.Mint) {
                    _mint(mintProposals[index].amount);
                } else {
                    // is this a new sigantory?
                    address newSignatory = accessProposals[index].authority;

                    // don't re-add a signatory if they already have granted access.
                    if (!authorised[newSignatory].granted) {
                        if (accessProposals[index].action == AccessAction.Grant) {
                            authorised[newSignatory] = Signatory(true);
                            authorisedCount = authorisedCount.add(1);
                        }
                    } else {
                        // only revoke signatory status if they have previously been granted access.
                        if (accessProposals[index].action == AccessAction.Revoke) {
                            authorised[newSignatory].granted = false;
                            authorisedCount = authorisedCount.sub(1);
                        }
                    }
                }
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

    event Signed(uint256 index);
}

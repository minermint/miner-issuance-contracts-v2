// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "./Miner.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum ProposalType { Mint, Access, Withdrawal }

enum AccessAction { None, Grant, Revoke }

struct Proposal {
    address proposer;
    uint256 expires;
    uint256 signatures;
    bool open;
    ProposalType proposalType;
}

struct Veto {
    address proposer;
    uint256 endorsements;
    bool enforced;
    uint256 proposal;
}

struct MintProposal {
    uint256 amount;
}

struct WithdrawalProposal {
    address recipient;
    uint256 amount;
}

struct AccessProposal {
    address signatory;
    AccessAction action;
}

struct Signatory {
    AccessAction action;
}

contract Treasury is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for Miner;

    Miner private _token;

    uint8 public constant MINIMUM_SIGNATORIES = 3;

    mapping(address => Signatory) public signatories;
    address[] public signatoriesIndex;
    uint256 public grantedCount;

    Proposal[] public proposals;
    // signatures[proposalIndex][signatoryAddress] = signed (true)
    mapping(uint256 => mapping(address => bool)) public signed;
    mapping(uint256 => address[]) public signatures;

    Veto[] public vetoes;
    mapping(uint256 => bool) public vetoedProposals;
    mapping(uint256 => mapping(address => bool)) public vetoed;
    mapping(uint256 => address[]) public vetoers;

    mapping(uint256 => AccessProposal) public accessProposals;
    mapping(uint256 => MintProposal) public mintProposals;
    mapping(uint256 => WithdrawalProposal) public withdrawalProposals;

    constructor(Miner token) public {
        _token = token;
        _grantSignatory(_msgSender());
    }

    function inSigningPeriod() public view returns (bool) {
        if (proposals.length == 0) {
            return false;
        }

        uint256 i = proposals.length.sub(1);
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
        external
        onlySignatory()
        noPendingProposals()
        minimumSignatories()
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
        external
        onlySignatory()
        noPendingProposals()
    {
        require(signatory != address(0), "Treasury/invalid-address");
        require(
            signatories[signatory].action != AccessAction.Grant,
            "Treasury/access-granted"
        );

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
        external
        onlySignatory()
        noPendingProposals()
    {
        require(
            grantedCount > MINIMUM_SIGNATORIES,
            "Treasury/minimum-signatories"
        );
        require(signatory != address(0), "Treasury/invalid-address");
        require(
            signatories[signatory].action == AccessAction.Grant,
            "Treasury/no-signatory-or-revoked"
        );

        uint256 index = getProposalsCount();

        accessProposals[index] = AccessProposal(signatory, AccessAction.Revoke);

        _propose(ProposalType.Access);
    }

    /**
     * Proposes the withdrawal of Miner to a recipient's wallet address.
     * @param recipient address The address of the recipient.
     * @param amount uint256 The amount of Miner to withdraw to the recipient's
     * wallet.
     */
    function proposeWithdrawal(address recipient, uint256 amount)
        external
        onlySignatory()
        noPendingProposals()
        minimumSignatories()
    {
        require(amount > 0, "Treasury/zero-amount");

        withdrawalProposals[proposals.length] = WithdrawalProposal(
            recipient,
            amount
        );

        _propose(ProposalType.Withdrawal);
    }

    /**
     * Veto an existing, pending proposal.
     */
    function vetoProposal()
        external
        onlySignatory()
        minimumSignatories()
        latestProposalPending()
    {
        uint256 totalProposals = getProposalsCount();

        uint256 index = totalProposals.sub(1);

        require(!vetoedProposals[index], "Treasury/veto-pending");

        Veto memory veto = Veto(msg.sender, 0, false, index);

        vetoedProposals[index] = true;
        vetoes.push(veto);

        endorseVeto();
    }

    /**
     * Endorse a veto.
     */
    function endorseVeto()
        public
        latestProposalPending()
        onlySignatory()
    {
        uint256 totalVetoes = getVetoCount();

        require(totalVetoes > 0, "Treasury/no-vetoes");

        uint256 index = totalVetoes.sub(1);

        require(
            vetoed[index][msg.sender] != true,
            "Treasury/signatory-already-vetoed"
        );

        Proposal storage vetoedProposal = proposals[vetoes[index].proposal];

        vetoed[index][msg.sender] = true;
        vetoers[index].push(msg.sender);

        vetoes[index].endorsements = vetoes[index].endorsements.add(1);

        if (vetoes[index].endorsements >= getRequiredSignatoryCount()) {
            proposals[vetoes[index].proposal].open = false;
            vetoes[index].enforced = true;

            _revokeSignatory(vetoedProposal.proposer);

            emit Vetoed(index, vetoes[index].proposal);
        }
    }

    function _propose(ProposalType proposalType) private returns (uint256) {
        Proposal memory proposal = Proposal(
            msg.sender,
            now + 48 hours,
            0,
            true,
            proposalType
        );

        proposals.push(proposal);

        sign();
    }

    /**
     * Gets the total number of signatories.
     *
     * The getSignatoryCount gets the total number of signatories, whether
     * their access is granted or revoked. To retrieve the number of granted
     * signatories, use grantedCount.
     * @return uint256 The total number of signatories.
     */
    function getSignatoryCount() public view returns (uint256) {
        return signatoriesIndex.length;
    }

    /**
     * Gets the number of proposals.
     * @return uint256 The number of proposals.
     */
    function getProposalsCount() public view returns (uint256) {
        return proposals.length;
    }

    /**
     * Gets the number of vetoes.
     * @return uint256 The number of vetoes.
     */
    function getVetoCount() public view returns (uint256) {
        return vetoes.length;
    }

    /**
     * Gets the signatures for a proposal.
     * @param proposal uint256 the proposal id.
     * @return address[] A list if signatures for the proposal.
     */
    function getSignatures(uint256 proposal)
        external
        view
        returns (address[] memory)
    {
        return signatures[proposal];
    }

    /**
     * Gets the signatures for a veto.
     * @param veto uint256 the veto id.
     * @return address[] A list if signatures for the veto.
     */
    function getVetoEndorsements(uint256 veto)
        external
        view
        returns (address[] memory)
    {
        return vetoers[veto];
    }

    /**
     * Signs a proposal. If the required number of signatories is reached,
     * execute the appropriate proposal action.
     */
    function sign() public onlySignatory() latestProposalPending() {
        require(proposals.length > 0, "Treasury/no-proposals");
        uint256 index = getProposalsCount().sub(1);

        require(
            signed[index][msg.sender] != true,
            "Treasury/signatory-already-signed"
        );

        signatures[index].push(msg.sender);
        signed[index][msg.sender] = true;
        proposals[index].signatures = proposals[index].signatures.add(1);

        if (proposals[index].signatures >= getRequiredSignatoryCount()) {
            proposals[index].open = false;

            if (proposals[index].proposalType == ProposalType.Mint) {
                _printerGoesBrr(mintProposals[index].amount);
            } else if (
                proposals[index].proposalType == ProposalType.Withdrawal
            ) {
                _withdraw(
                    withdrawalProposals[index].recipient,
                    withdrawalProposals[index].amount
                );
            } else {
                _updateSignatoryAccess();
            }
        }

        emit Signed(index);
    }

    function getRequiredSignatoryCount() public view returns (uint256) {
        return grantedCount.div(2).add(1);
    }

    function _updateSignatoryAccess() private {
        uint256 index = getProposalsCount().sub(1);
        // is this a new signatory?
        address signatory = accessProposals[index].signatory;

        if (accessProposals[index].action == AccessAction.Grant) {
            _grantSignatory(signatory);

            emit AccessGranted(signatory);
        } else {
            _revokeSignatory(signatory);

            emit AccessRevoked(signatory);
        }
    }

    function _grantSignatory(address signatory) private {
        // if a new signatory, add to list.
        if (signatories[signatory].action != AccessAction.Revoke) {
            signatoriesIndex.push(signatory);
        }

        signatories[signatory] = Signatory(AccessAction.Grant);
        grantedCount = grantedCount.add(1);
    }

    function _revokeSignatory(address signatory) private {
        signatories[signatory] = Signatory(AccessAction.Revoke);
        grantedCount = grantedCount.sub(1);
    }

    function _printerGoesBrr(uint256 amount) private {
        _token.mint(amount);

        Minted(amount);
    }

    function _withdraw(address recipient, uint256 amount) private {
        _token.transfer(recipient, amount);

        emit Withdrawn(recipient, amount);
    }

    modifier onlySignatory() {
        require(
            signatories[msg.sender].action == AccessAction.Grant,
            "Treasury/invalid-signatory"
        );
        _;
    }

    modifier latestProposalPending() {
        uint256 totalProposals = getProposalsCount();

        if (totalProposals > 0) {
            uint256 index = totalProposals.sub(1);

            require(
                proposals[index].open && inSigningPeriod(),
                "Treasury/proposal-expired"
            );
        }
        _;
    }

    modifier noPendingProposals() {
        uint256 totalProposals = getProposalsCount();

        if (totalProposals > 0) {
            uint256 index = totalProposals.sub(1);

            require(
                !proposals[index].open || !inSigningPeriod(),
                "Treasury/proposal-pending"
            );
        }
        _;
    }

    modifier minimumSignatories() {
        require(
            grantedCount >= MINIMUM_SIGNATORIES,
            "Treasury/minimum-signatories"
        );
        _;
    }

    event Signed(uint256 indexed index);

    event AccessGranted(address indexed signatory);
    event AccessRevoked(address indexed signatory);

    event Minted(uint256 amount);

    event Withdrawn(address indexed recipient, uint256 amount);

    event Vetoed(uint256 indexed veto, uint256 indexed proposal);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EVoting {
    struct TpsFinalRecord {
        uint256 electionId;
        uint256 tpsId;
        uint256[] candidatePairIds;
        uint256[] voteTotals;
        uint256 totalRegisteredVoters;
        uint256 totalVerifiedVoters;
        string documentHash;
        string auditLogHash;
        uint256 finalizedAt;
    }

    // electionId => tpsId => TpsFinalRecord
    mapping(uint256 => mapping(uint256 => TpsFinalRecord)) public finalRecords;

    event TpsResultAnchored(
        uint256 indexed electionId,
        uint256 indexed tpsId,
        string documentHash,
        string auditLogHash,
        uint256 finalizedAt
    );

    /**
     * Anchors a final TPS e-voting result to the blockchain.
     * Rejects duplicates if the same electionId and tpsId combination has been finalized.
     */
    function anchorTpsResult(
        uint256 _electionId,
        uint256 _tpsId,
        uint256[] memory _candidatePairIds,
        uint256[] memory _voteTotals,
        uint256 _totalRegisteredVoters,
        uint256 _totalVerifiedVoters,
        string memory _documentHash,
        string memory _auditLogHash
    ) public {
        require(finalRecords[_electionId][_tpsId].finalizedAt == 0, "TPS result already finalized for this election");
        require(_candidatePairIds.length == _voteTotals.length, "Candidates and vote totals length mismatch");

        finalRecords[_electionId][_tpsId] = TpsFinalRecord({
            electionId: _electionId,
            tpsId: _tpsId,
            candidatePairIds: _candidatePairIds,
            voteTotals: _voteTotals,
            totalRegisteredVoters: _totalRegisteredVoters,
            totalVerifiedVoters: _totalVerifiedVoters,
            documentHash: _documentHash,
            auditLogHash: _auditLogHash,
            finalizedAt: block.timestamp
        });

        emit TpsResultAnchored(
            _electionId,
            _tpsId,
            _documentHash,
            _auditLogHash,
            block.timestamp
        );
    }

    /**
     * Helper function to fetch a TPS final record.
     */
    function getTpsFinalRecord(uint256 _electionId, uint256 _tpsId) public view returns (TpsFinalRecord memory) {
        require(finalRecords[_electionId][_tpsId].finalizedAt > 0, "TPS result not finalized");
        return finalRecords[_electionId][_tpsId];
    }
}
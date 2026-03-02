// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EVoting {

    struct Candidate {
        uint256 id;
        string name;
    }

    uint256 public candidateCount;
    uint256 public tpsCount;

    mapping(uint256 => Candidate) public candidates;

    // votes[tpsId][candidateId] = jumlah suara
    mapping(uint256 => mapping(uint256 => uint256)) public votes;

    event VoteCast(
        uint256 indexed tpsId,
        uint256 indexed candidateId,
        uint256 timestamp
    );

    function addCandidate(string memory _name) public {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name);
    }

    function castVote(uint256 _tpsId, uint256 _candidateId) public {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");

        votes[_tpsId][_candidateId] += 1;

        emit VoteCast(_tpsId, _candidateId, block.timestamp);
    }

    function getVotes(uint256 _tpsId, uint256 _candidateId) public view returns (uint256) {
        return votes[_tpsId][_candidateId];
    }
}
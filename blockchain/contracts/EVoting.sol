// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EVoting {

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    address public owner;
    bool public electionActive;

    mapping(uint => Candidate) public candidates;
    mapping(address => bool) public hasVoted;

    uint public candidatesCount;

    event VoteCast(address indexed voter, uint candidateId);
    event ElectionStatusChanged(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        electionActive = true;
    }

    function addCandidate(string memory _name) public onlyOwner {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function castVote(uint _candidateId) public {
        require(electionActive, "Election closed");
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId);
    }

    function endElection() public onlyOwner {
        electionActive = false;
        emit ElectionStatusChanged(false);
    }

    function getCandidate(uint _id) public view returns (uint, string memory, uint) {
        Candidate memory c = candidates[_id];
        return (c.id, c.name, c.voteCount);
    }
}
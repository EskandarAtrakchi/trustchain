// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleCredentialRegistry {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /* ========== INSTITUTIONS ========== */
    struct Institution {
        address instAddress;
        string name;
        bool active;
    }

    mapping(address => Institution) public institutions;
    mapping(string => bool) private institutionNames; // prevent duplicate names
    address[] public institutionList;

    event InstitutionAdded(address indexed inst, string name);

    function addInstitution(address inst, string calldata name) external onlyOwner {
        require(inst != address(0), "zero address");
        require(bytes(name).length > 0, "empty name");
        require(!institutionNames[name], "name exists");
        require(institutions[inst].instAddress == address(0), "duplicate address");

        institutions[inst] = Institution(inst, name, true);
        institutionNames[name] = true;
        institutionList.push(inst);

        emit InstitutionAdded(inst, name);
    }

    function isInstitution(address inst) public view returns (bool) {
        return institutions[inst].active;
    }

    /* ========== CREDENTIALS ========== */
    struct Credential {
        string studentName;
        string issuerName;
        string title;
        bool active;
    }

    // mapping: student wallet => institution address => array of credentials
    mapping(address => mapping(address => Credential[])) private studentInstitutionCredentials;
    // list of institutions per student (for iteration)
    mapping(address => address[]) private studentInstitutions;

    modifier onlyInstitution() {
        require(isInstitution(msg.sender), "Not institution");
        _;
    }

    /* ========== ISSUE / CRUD ========= */
    function issueCredential(
        address student,
        string calldata studentName,
        string calldata title
    ) external onlyInstitution {
        require(student != address(0), "zero student");
        require(bytes(studentName).length > 0, "empty studentName");
        require(bytes(title).length > 0, "empty title");

        Credential memory c = Credential({
            studentName: studentName,
            issuerName: institutions[msg.sender].name,
            title: title,
            active: true
        });

        // Add institution to student's list if first time
        if (studentInstitutionCredentials[student][msg.sender].length == 0) {
            studentInstitutions[student].push(msg.sender);
        }

        studentInstitutionCredentials[student][msg.sender].push(c);
    }

    // ---- UPDATE CREDENTIAL ----
    function updateCredential(
        address student,
        uint256 credentialIndex,
        string calldata newStudentName,
        string calldata newTitle
    ) external onlyInstitution {
        require(credentialIndex < studentInstitutionCredentials[student][msg.sender].length, "index out of range");

        Credential storage c = studentInstitutionCredentials[student][msg.sender][credentialIndex];
        require(c.active, "credential revoked");

        if (bytes(newStudentName).length > 0) {
            c.studentName = newStudentName;
        }

        if (bytes(newTitle).length > 0) {
            c.title = newTitle;
        }
    }

    // ---- REVOKE ----
    function revokeCredential(address student, address institution, uint256 index) external onlyOwner {
        require(index < studentInstitutionCredentials[student][institution].length, "index out of range");
        Credential storage c = studentInstitutionCredentials[student][institution][index];
        c.active = false;
    }

    /* ========== PUBLIC VERIFY ========= */
    struct CredentialView {
        string studentName;
        string issuerName;
        string title;
    }

    /// @notice Returns all **active credentials** for a student
    function verifyStudent(address student) external view returns (CredentialView[] memory) {
        address[] storage insts = studentInstitutions[student];

        // Count total active credentials
        uint256 totalActive = 0;
        for (uint256 i = 0; i < insts.length; i++) {
            Credential[] storage creds = studentInstitutionCredentials[student][insts[i]];
            for (uint256 j = 0; j < creds.length; j++) {
                if (creds[j].active) totalActive++;
            }
        }

        // Populate output array
        CredentialView[] memory result = new CredentialView[](totalActive);
        uint256 k = 0;
        for (uint256 i = 0; i < insts.length; i++) {
            Credential[] storage creds = studentInstitutionCredentials[student][insts[i]];
            for (uint256 j = 0; j < creds.length; j++) {
                if (creds[j].active) {
                    result[k] = CredentialView({
                        studentName: creds[j].studentName,
                        issuerName: creds[j].issuerName,
                        title: creds[j].title
                    });
                    k++;
                }
            }
        }
        return result;
    }
}

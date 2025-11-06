// Add Institution
simpleRegistry.addInstitution(0xInstitution, "Oxford University");

// Issue Credential
simpleRegistry.issueCredential(
    0xStudent,
    "Alice Johnson",
    "Bachelor of Computer Science"
);

// Verify Student
simpleRegistry.verifyStudent(0xStudent);

"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { issueCertificate } from "@/lib/web3-provider"
import { uploadToIPFS, generateCertificateMetadata, uploadImageToIPFS } from "@/lib/ipfs-provider"

// This component provides a form for the issuer to input certificate details and issue a new certificate.
interface IssueCertificateFormProps {
  issuerAddress: string
  onSuccess: () => void
}

// The IssueCertificateForm component is responsible for rendering a form that allows the issuer to input the necessary details to issue a new certificate.
export default function IssueCertificateForm({ issuerAddress, onSuccess }: IssueCertificateFormProps) {
  const [studentAddress, setStudentAddress] = useState("")
  const [institutionName, setInstitutionName] = useState("")
  const [studentName, setStudentName] = useState("")
  const [degreeName, setDegreeName] = useState("")
  const [graduationDate, setGraduationDate] = useState("")
  const [certificateImage, setCertificateImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Handle change event for the certificate image file input. It checks if a file has been selected and updates the certificateImage state with the selected file.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if a file has been selected in the file input. 
    if (e.target.files && e.target.files[0]) {
      setCertificateImage(e.target.files[0])
    }
  }

  // Handle form submission for issuing a new certificate.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    // The certificate issuance process involves several steps,  validating the form inputs, uploading the certificate image to IPFS (if an image is provided), generating the certificate metadata, uploading the metadata to IPFS, and finally calling the smart contract function to issue the certificate.
    try {
      console.log("Starting certificate issuance process")

      // Validate inputs
      if (!studentAddress || !institutionName || !studentName || !degreeName || !graduationDate) {
        throw new Error("All fields are required")
      }

      // Validate Ethereum address
      if (!studentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Invalid student wallet address")
      }

      console.log("Inputs validated")

      // Upload certificate image to IPFS if provided
      let imageIPFSURL = ""
      // If the issuer has selected a certificate image, we upload it to IPFS and get the resulting URL.
      if (certificateImage) {
        console.log("Uploading certificate image to IPFS")
        imageIPFSURL = await uploadImageToIPFS(certificateImage)
        console.log("Certificate image uploaded:", imageIPFSURL)
      }

      // Generate certificate metadata using the provided details and the image URL (if available). 
      const metadata = generateCertificateMetadata(
        institutionName,
        studentName,
        degreeName,
        graduationDate,
        imageIPFSURL,
      )

      console.log("Uploading metadata to IPFS")

      // Upload metadata to IPFS
      const metadataURI = await uploadToIPFS(metadata)
      console.log("Metadata uploaded to IPFS:", metadataURI)

      // Issue certificate on blockchain
      console.log("Calling smart contract to issue certificate")
      const receipt = await issueCertificate(
        issuerAddress,
        studentAddress,
        metadataURI,
        institutionName,
        studentName,
        degreeName,
        graduationDate,
      )

      console.log("Certificate issued successfully:", receipt)

      // Reset form and show success message
      setSuccess(true)
      setStudentAddress("")
      setInstitutionName("")
      setStudentName("")
      setDegreeName("")
      setGraduationDate("")
      setCertificateImage(null)

      // After successfully issuing the certificate, we call the onSuccess callback after a short delay to allow the user to see the success message.
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err: any) {
      console.error("Certificate issuance error:", err)

      // We extract the error message from the caught error object. 
      const rawMessage = err?.reason || err?.message || String(err || "")
      if (rawMessage.includes("Certificate already issued")) {
        setError(
          "A certificate has already been issued for this wallet address. Each wallet can only have one certificate."
        )
        // If the error message indicates that the student wallet address is invalid according to the smart contract, we set an appropriate error message to inform the user about the issue with the provided wallet address.
      } else if (rawMessage.includes("Invalid student address")) {
        setError("The student wallet address is invalid according to the smart contract.")
        // If the error message indicates that the issuer is not the contract owner, we set an error message to inform the user that only the issuer wallet can issue certificates.
      } else if (rawMessage.includes("Not contract owner")) {
        setError("You are not the contract owner. Only the issuer wallet can issue certificates.")
        // For any other errors that do not match the specific cases above, we set a generic error message that includes the raw error message for debugging purposes.
      } else {
        setError(`Failed to issue certificate: ${rawMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // The component renders a card that contains the form for issuing a new certificate. The form includes input fields for the student wallet address, institution name, student name, degree name, graduation date, and an optional file input for uploading a certificate image.
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Issue New Certificate</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Student Wallet Address</label>
            <input
              type="text"
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Institution Name</label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g., National College of Ireland"
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g., Eskandar Atrakchi"
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Degree Name</label>
            <input
              type="text"
              value={degreeName}
              onChange={(e) => setDegreeName(e.target.value)}
              placeholder="e.g., BSc in Computing"
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Graduation Date</label>
            <input
              type="date"
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Certificate Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {certificateImage && (
              <p className="text-xs text-muted-foreground mt-1">File: {certificateImage.name}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-secondary/10 border border-secondary/30 rounded text-secondary text-sm">
              Certificate issued successfully! Transaction confirmed.
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? "Issuing..." : "Issue Certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

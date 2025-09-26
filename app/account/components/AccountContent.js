"use client"

import { useEffect, useState, useCallback } from "react"
import QRCode from "react-qr-code"
import { createPortal } from "react-dom"
import {
  QrCodeIcon as QrIcon,
  Info,
  Settings,
  Shield,
  Building,
  MapPin,
  Link,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  User,
  X,
} from "lucide-react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "../../libs/firebaseConfig"
import { generateLinkToken, initializeMachineLink } from "../utils/machine-link"
import { addAccessLog } from "../utils/logging"

const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`

function SkeletonCard() {
  return (
    <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col animate-pulse">
      <div className="mb-4 space-y-2">
        <div className="h-6 bg-white/20 rounded w-1/3" />
        <div className="h-4 bg-white/15 rounded w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-white/20 rounded w-2/3" />
            <div className="h-4 bg-white/15 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BasicInfoCard({ machineDetails = {}, machineId }) {
  // Add null check for machineDetails
  if (!machineDetails) {
    return (
      <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col border border-white/10">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-300" /> Basic Information
          </h3>
          <p className="text-sm text-white/70">Machine details and configuration</p>
        </div>
        <div className="grid grid-cols-2 gap-4 flex-1">
          {[
            { label: "Machine Name", field: "name", icon: Settings },
            { label: "Machine ID", field: "id", icon: QrIcon },
            { label: "Model", field: "model", icon: Building },
            { label: "Location", field: "location", icon: MapPin },
          ].map(({ label, field, icon: Icon }) => (
            <div key={field} className="space-y-1">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <Icon className="w-4 h-4 text-cyan-300" /> {label}
              </label>
              <p className="italic text-white/50">Loading...</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col border border-white/10">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-300" /> Basic Information
        </h3>
        <p className="text-sm text-white/70">Machine details and configuration</p>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1">
        {[
          { label: "Machine Name", field: "name", icon: Settings },
          { label: "Machine ID", field: "id", icon: QrIcon },
          { label: "Model", field: "model", icon: Building },
          { label: "Location", field: "location", icon: MapPin },
        ].map(({ label, field, icon: Icon }) => (
          <div key={field} className="space-y-1">
            <label className="text-sm text-white/70 flex items-center gap-2">
              <Icon className="w-4 h-4 text-cyan-300" /> {label}
            </label>
            {field === "id" ? (
              <p className="font-medium text-white">{machineId}</p>
            ) : machineDetails[field] ? (
              <p className="font-medium text-white">{machineDetails[field]}</p>
            ) : (
              <p className="italic text-white/50">No {label.toLowerCase()} added</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnerDetailsCard({ linkStatus, formatDate }) {
  const fields = [
    {
      label: "Owner Name",
      value: linkStatus.linkedUser?.name || linkStatus.linkedUser?.fullname || linkStatus.linkedUser?.username,
      icon: User,
    },
    {
      label: "Email Address",
      value: linkStatus.linkedUser?.email,
      icon: Link,
    },
    {
      label: "Linked Since",
      value: linkStatus.isLinked ? formatDate(linkStatus.linkTime) : null,
      icon: RefreshCw,
    },
    {
      label: "Status",
      value: linkStatus.isLinked ? "Connected" : "Not Connected",
      icon: linkStatus.isLinked ? Wifi : WifiOff,
    },
  ]

  return (
    <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col border border-white/10">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-300" /> Owner Details
        </h3>
        <p className="text-sm text-white/70">User linking information</p>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="space-y-1">
            <label className="text-sm text-white/70 flex items-center gap-2">
              <Icon className="w-4 h-4 text-cyan-300" /> {label}
            </label>
            {value ? (
              <p className="font-medium text-white">{value}</p>
            ) : (
              <p className="italic text-white/50">No {label.toLowerCase()} available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function QRCodeCard({ linkStatus, qrCodeData, generatingQR, generateQRCode, handleDownloadQR, formatDate }) {
  const [isModalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!document.getElementById("qr-animations")) {
      const style = document.createElement("style")
      style.id = "qr-animations"
      style.textContent = fadeInKeyframes
      document.head.appendChild(style)
      return () => document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col border border-white/10">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <QrIcon className="w-5 h-5 text-cyan-300" /> QR Code
        </h3>
        <p className="text-sm text-white/70">Machine linking information</p>
      </div>
      <div className="flex flex-1">
        {/* Left pane: QR or status */}
        <div className="w-1/2 flex items-center justify-center">
          {linkStatus.isLinked ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                <QrIcon className="w-12 h-12 text-white/70" />
              </div>
              <p className="text-sm text-white/70 mt-2">Machine already linked</p>
            </div>
          ) : qrCodeData ? (
            <div
              className="p-3 bg-white rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              onClick={() => setModalOpen(true)}
              title="Click to enlarge"
            >
              <QRCode
                id="machine-qr-code"
                value={JSON.stringify(qrCodeData)}
                size={180}
                level="H"
                viewBox="0 0 256 256"
              />
            </div>
          ) : (
            <button
              onClick={generateQRCode}
              disabled={generatingQR}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-md flex items-center gap-2 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-blue-900/30"
            >
              <QrIcon className="w-4 h-4" />
              {generatingQR ? "Generating…" : "Generate QR Code"}
            </button>
          )}
        </div>

        {/* Right pane: metadata + download/refresh */}
        <div className="w-1/2 flex flex-col justify-start pl-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <QrIcon className="w-4 h-4 text-cyan-300" /> Machine ID
              </label>
              <p className="font-medium text-sm text-white break-all">
                {qrCodeData?.id ?? <span className="italic text-white/50">No ID</span>}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-300" /> Generated
              </label>
              <p className="font-medium text-sm text-white">{qrCodeData ? formatDate(qrCodeData.timestamp) : "—"}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-300" /> Expires
              </label>
              <p className="font-medium text-sm text-white">{qrCodeData ? formatDate(qrCodeData.expiresAt) : "—"}</p>
            </div>
          </div>

          {!linkStatus.isLinked && qrCodeData && (
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </button>
              <button
                onClick={generateQRCode}
                disabled={generatingQR}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* full-screen modal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
            style={{ isolation: "isolate" }}
          >
            <div
              className="relative bg-white p-6 rounded-lg shadow-2xl animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="p-2">
                <QRCode value={JSON.stringify(qrCodeData)} size={300} level="H" viewBox="0 0 256 256" />
              </div>
              <div className="mt-4 text-center text-gray-700 text-sm">Click anywhere outside to close</div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function ConnectionStatusCard({ linkStatus, formatDate }) {
  return (
    <div className="h-full bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col border border-white/10">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Link className="w-5 h-5 text-cyan-300" /> Connection Status
        </h3>
        <p className="text-sm text-white/70">Machine connection information</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {linkStatus.isLinked ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-green-600/20 backdrop-blur-sm flex items-center justify-center mb-4 border border-green-400/30">
              <Wifi className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-green-400 font-bold text-lg">Connected</p>
            <p className="text-sm text-white/70 mt-1">Since {formatDate(linkStatus.linkTime)}</p>
            {(linkStatus.linkedUser?.name || linkStatus.linkedUser?.fullname || linkStatus.linkedUser?.username) && (
              <div className="mt-4 text-center">
                <p className="text-sm text-white/70">Connected User</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <User className="w-4 h-4 text-cyan-300" />
                  <p className="font-medium text-white">
                    {linkStatus.linkedUser.name || linkStatus.linkedUser.fullname || linkStatus.linkedUser.username}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
              <WifiOff className="w-8 h-8 text-white/70" />
            </div>
            <p className="text-white/80 font-medium text-lg">Not connected</p>
            <p className="text-sm text-white/60 mt-1">Generate a QR code to connect this machine</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AccountContent() {
  const [loading, setLoading] = useState(true)
  const [machineDetails, setMachineDetails] = useState(null)
  const [machineId, setMachineId] = useState(null)
  const [qrCodeData, setQrCodeData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDetails, setEditedDetails] = useState({})
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [generatingQR, setGeneratingQR] = useState(false)
  const [linkStatus, setLinkStatus] = useState({ isLinked: false })
  const [currentCard, setCurrentCard] = useState(0)

  const cards = [
    { id: "basic", label: "Basic Info", icon: Info, component: BasicInfoCard },
    { id: "owner", label: "Owner Details", icon: User, component: OwnerDetailsCard },
    { id: "qr", label: "QR Code", icon: QrIcon, component: QRCodeCard },
    { id: "status", label: "Connection Status", icon: Link, component: ConnectionStatusCard },
  ]

  const nextCard = () => {
    try {
      setCurrentCard((i) => (i + 1) % cards.length)
    } catch (e) {
      console.error("[AccountContent] Failed to go to next card:", e)
    }
  }
  const prevCard = () => {
    try {
      setCurrentCard((i) => (i - 1 + cards.length) % cards.length)
    } catch (e) {
      console.error("[AccountContent] Failed to go to previous card:", e)
    }
  }
  const goToCard = (i) => {
    try {
      if (i >= 0 && i < cards.length) {
        setCurrentCard(i)
      }
    } catch (e) {
      console.error("[AccountContent] Failed to go to card:", e)
    }
  }

  const generateQRCodeFn = useCallback(async () => {
    if (!machineDetails || !machineId) return
    setGeneratingQR(true)
    try {
      const { token, expiresAt } = await generateLinkToken(machineId)
      setQrCodeData({
        id: machineId,
        name: machineDetails.name || "Unknown Machine",
        serialNumber: machineDetails.serialNumber || "N/A",
        timestamp: new Date().toISOString(),
        linkToken: token,
        expiresAt,
      })
    } catch (e) {
      console.error("[AccountContent] Failed to generate QR code:", e)
    } finally {
      setGeneratingQR(false)
    }
  }, [machineDetails, machineId])

  // ── Initial load + linkStatus population with enhanced debugging ────────────────
  useEffect(() => {
    let unsub
    ;(async () => {
      try {
        // 1) session
        const s = await fetch("/api/auth/session").then((r) => r.json())
        if (!s.machineId) {
          console.error("[AccountContent] No machineId in session")
          setMachineDetails({})
          setMachineId(null)
          return
        }
        setMachineId(s.machineId)

        // 2) machine doc
        const machineSnap = await getDoc(doc(db, "machines", s.machineId))
        if (!machineSnap.exists()) {
          console.error("[AccountContent] Machine not found")
          setMachineDetails({})
          setMachineId(null)
          return
        }
        const m = machineSnap.data()
        setMachineDetails(m)
        setEditedDetails(m)

        // 3) seed linkStatus with enhanced user data fetching
        const usersMap = m.linkedUsers || {}
        const [uid, info] = Object.entries(usersMap)[0] || []

        if (uid) {
          const uSnap = await getDoc(doc(db, "users", uid))

          if (uSnap.exists()) {
            const ud = uSnap.data()

            // Try multiple possible name fields
            const userName = ud.fullname || ud.username || ud.displayName || ud.name || "Unknown User"

            const newStatus = {
              isLinked: true,
              linkedUser: {
                uid,
                name: userName,
                fullname: ud.fullname,
                username: ud.username,
                displayName: ud.displayName,
                email: ud.email || "",
              },
              linkTime: info.linkedAt,
            }
            setLinkStatus(newStatus)
          } else {
            // Set a partial status indicating the link exists but user data is missing
            setLinkStatus({
              isLinked: true,
              linkedUser: {
                uid,
                name: "User data not found",
                email: "",
              },
              linkTime: info.linkedAt,
            })
          }
        }

        // 4) real-time listener (merge delta fields)
        const realTimeUpdater = (status) => {
          setLinkStatus((prev) => {
            const updated = {
              ...prev,
              ...status,
              linkedUser: status.linkedUser
                ? {
                    ...prev.linkedUser,
                    ...status.linkedUser,
                  }
                : prev.linkedUser,
            }
            return updated
          })
        }
        try {
          unsub = initializeMachineLink(s.machineId, realTimeUpdater)
        } catch (e) {
          console.error("[AccountContent] Failed to initialize machine link:", e)
        }
      } catch (e) {
        console.error("[AccountContent] fetch error:", e)
        // Set default values on error to prevent null access
        setMachineDetails({})
        setMachineId(null)
      } finally {
        setLoading(false)
      }
    })()

    return () => unsub?.()
  }, [])

  const handleEdit = () => {
    try {
      setIsEditing(true)
    } catch (e) {
      console.error("[AccountContent] Failed to enable editing:", e)
    }
  }
  const handleCancel = () => {
    try {
      setIsEditing(false)
      setSaveError("")
      setSaveSuccess("")
    } catch (e) {
      console.error("[AccountContent] Failed to cancel editing:", e)
    }
  }
  const handleInputChange = (field, value) => {
    try {
      setEditedDetails((d) => ({ ...d, [field]: value }))
    } catch (e) {
      console.error("[AccountContent] Failed to update input:", e)
    }
  }
  const handleSave = async () => {
    if (!machineId) return
    try {
      setSaveError("")
      setSaveSuccess("")
      await updateDoc(doc(db, "machines", machineId), {
        ...editedDetails,
        updatedAt: new Date().toISOString(),
      })
      if (machineId) {
        try {
          await addAccessLog({
            action: "machine_update",
            machineId,
            status: "success",
            details: "Updated",
          })
        } catch (logError) {
          console.error("[AccountContent] Failed to log access:", logError)
        }
      }
      setMachineDetails(editedDetails)
      setIsEditing(false)
      setSaveSuccess("Saved")
    } catch (e) {
      console.error("[AccountContent] Failed to save machine details:", e)
      setSaveError(e.message || "Error")
    }
  }

  const handleDownloadQR = () => {
    if (!machineId) return
    try {
      const svg = document.getElementById("machine-qr-code")
      if (!svg) return
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()
      const data = new XMLSerializer().serializeToString(svg)
      const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }))
      canvas.width = canvas.height = 1000
      img.onload = () => {
        try {
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, 1000, 1000)
          ctx.drawImage(img, 0, 0, 1000, 1000)
          const png = canvas.toDataURL("image/png")
          const a = document.createElement("a")
          a.href = png
          a.download = `machine-qr-${machineId}.png`
          a.click()
          URL.revokeObjectURL(url)
        } catch (e) {
          console.error("[AccountContent] Failed to process image:", e)
        }
      }
      img.onerror = () => {
        console.error("[AccountContent] Failed to load image for download")
        URL.revokeObjectURL(url)
      }
      img.crossOrigin = "anonymous"
      img.src = url
    } catch (e) {
      console.error("[AccountContent] Failed to download QR code:", e)
    }
  }

  const formatDate = (ds) => {
    try {
      if (!ds) return "N/A"
      if (ds.toDate) return ds.toDate().toLocaleString()
      if (ds.seconds) return new Date(ds.seconds * 1000).toLocaleString()
      return new Date(ds).toLocaleString()
    } catch (e) {
      console.error("[AccountContent] Failed to format date:", e)
      return "Invalid Date"
    }
  }

  if (loading || !machineDetails) return <SkeletonCard />

  return (
    <div className="h-full flex flex-col max-h-[380px]">
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300"
          style={{ transform: `translateX(-${currentCard * 100}%)` }}
        >
          {cards.map(({ id, component: C }) => (
            <div key={id} className="w-full flex-shrink-0 p-4 h-full box-border overflow-auto">
              <C
                machineDetails={machineDetails}
                machineId={machineId}
                isEditing={isEditing}
                editedDetails={editedDetails}
                saveError={saveError}
                saveSuccess={saveSuccess}
                generatingQR={generatingQR}
                qrCodeData={qrCodeData}
                linkStatus={linkStatus}
                generateQRCode={generateQRCodeFn}
                handleEdit={handleEdit}
                handleCancel={handleCancel}
                handleInputChange={handleInputChange}
                handleSave={handleSave}
                handleDownloadQR={handleDownloadQR}
                formatDate={formatDate}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={prevCard}
            className="p-1 rounded hover:bg-white/10 border border-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={nextCard}
            className="p-1 rounded hover:bg-white/10 border border-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="text-sm text-white/70">
          {currentCard + 1} / {cards.length}
        </div>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goToCard(i)}
              className={`w-2 h-2 rounded-full ${i === currentCard ? "bg-cyan-300" : "bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

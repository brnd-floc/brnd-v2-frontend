// src/pages/AdminPage/index.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// StyleSheet
import styles from "./AdminPage.module.scss";

// Components
import AppLayout from "@/shared/layouts/AppLayout";
import Typography from "@/components/Typography";
import Button from "@/shared/components/Button";

import { prepareBrandMetadata } from "@/services/admin";

// Hooks
import { useAuth } from "@/hooks/auth";
import { Brand, useBrandList } from "@/hooks/brands";
import { useStoriesInMotion } from "@/shared/hooks/contract/useStoriesInMotion";
import { useAccount } from "wagmi";

// Category mapping
const CATEGORIES = [
  { id: 1, name: "Infra" },
  { id: 2, name: "Social" },
  { id: 3, name: "Community" },
  { id: 4, name: "Finance" },
  { id: 5, name: "Game" },
  { id: 6, name: "AI" },
  { id: 7, name: "Media" },
] as const;

// Simple Admin Brand List Component
interface AdminBrandsListProps {
  onBrandSelect: (brand: Brand) => void;
}

function AdminBrandsList({ onBrandSelect }: AdminBrandsListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageId, setPageId] = useState<number>(1);

  const { data, isLoading, isFetching, refetch } = useBrandList(
    "all",
    searchQuery,
    pageId,
    50,
    "all"
  );

  useEffect(() => {
    refetch();
  }, [pageId, searchQuery, refetch]);

  useEffect(() => {
    setPageId(1);
  }, [searchQuery]);

  const handleScrollList = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const calc = scrollTop + clientHeight + 50;
    if (calc >= scrollHeight && !isFetching && data) {
      if (data.brands.length < data.count) {
        setPageId((prev) => prev + 1);
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Typography size={16} variant="druk" weight="wide">
          Loading brands...
        </Typography>
      </div>
    );
  }

  if (!data || data.brands.length === 0) {
    return (
      <div className={styles.loadingState}>
        <Typography size={16} variant="druk" weight="wide">
          No brands found
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.adminBrandsContainer}>
      {/* Search Input */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search brands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Brands List */}
      <div className={styles.adminBrandsList} onScroll={handleScrollList}>
        {data.brands.map((brand: Brand) => (
          <div
            key={brand.id}
            className={styles.adminBrandItem}
            onClick={() => onBrandSelect(brand)}
          >
            <div className={styles.brandImage}>
              {brand.imageUrl ? (
                <img src={brand.imageUrl} alt={brand.name} />
              ) : (
                <div className={styles.placeholderImage}>
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.brandInfo}>
              <Typography size={16} weight="bold">
                {brand.name}
              </Typography>
              <Typography size={12} className={styles.brandUrl}>
                {brand.url}
              </Typography>
              <Typography size={12} className={styles.brandMeta}>
                Score: {brand.score} | Type:{" "}
                {brand.queryType === 0 ? "Channel" : "Profile"}
                {brand.queryType === 0 &&
                  brand.channel &&
                  ` | ${brand.channel}`}
                {brand.queryType === 1 &&
                  brand.profile &&
                  ` | ${brand.profile}`}
              </Typography>
            </div>
            <div className={styles.editIndicator}>
              <Typography size={12} variant="druk" weight="wide">
                ✏️ Edit
              </Typography>
            </div>
          </div>
        ))}

        {/* Loading more indicator */}
        {isFetching && pageId > 1 && (
          <div className={styles.loadingMore}>
            <Typography size={12} variant="druk" weight="wide">
              Loading more...
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

// Types
interface BrandFormData {
  name: string;
  url: string;
  description: string;
  imageUrl: string;
  queryType: number;
  channelOrProfile: string;
  categoryId: number;
  followerCount: number;
  profile: string;
  channel: string;
  warpcastUrl?: string;
  handle?: string; // Brand handle (derived from channelOrProfile or custom)
  fid?: number; // FID of the brand owner
  walletAddress?: string; // Wallet address of the brand owner
  contractAddress?: string; // Contract address
  ticker?: string; // Ticker symbol (stored without $ prefix)
}

type AdminStep = "menu" | "form" | "confirm" | "success";

function AdminPage(): React.ReactNode {
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState<AdminStep>("menu");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successBrandId, setSuccessBrandId] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ipfsMetadataHash, setIpfsMetadataHash] = useState<string | null>(null);
  const [currentStepStatus, setCurrentStepStatus] = useState<
    "idle" | "validating" | "uploading-ipfs" | "ready-for-contract"
  >("idle");

  // Use StoriesInMotion hook for on-chain brand creation and updates
  const {
    createBrandOnChain,
    updateBrandOnChain,
    isCreatingBrand,
    isUpdatingBrand,
    isPending,
    isConfirming,
    error: contractError,
  } = useStoriesInMotion(
    undefined, // onLevelUpSuccess
    undefined, // onVoteSuccess
    undefined, // onClaimSuccess
    (txData) => {
      // onBrandCreateSuccess
      console.log("✅ Brand created on-chain successfully!", txData);
      // Extract brandId from transaction if possible
      // For now, we'll show success and let user navigate
      setCurrentStep("success");
    },
    (txData) => {
      // onBrandUpdateSuccess
      console.log("✅ Brand updated on-chain successfully!", txData);
      if (selectedBrand) {
        setSuccessBrandId(selectedBrand.id);
      }
      setCurrentStep("success");
    }
  );

  const [formData, setFormData] = useState<BrandFormData>({
    name: "",
    url: "",
    description: "",
    imageUrl: "",
    queryType: 0, // 0 = Channel, 1 = Profile
    channelOrProfile: "",
    categoryId: 1,
    followerCount: 0,
    profile: "",
    channel: "",
    warpcastUrl: "",
    handle: "", // Will be derived from channelOrProfile
    fid: user?.fid ? Number(user.fid) : undefined, // Default to current user's FID
    walletAddress: "", // Default to connected wallet
    contractAddress: "",
    ticker: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Update formData when user or walletAddress becomes available
  useEffect(() => {
    if (user?.fid && !formData.fid) {
      setFormData((prev) => ({
        ...prev,
        fid: Number(user.fid),
      }));
    }
  }, [user?.fid]);

  // Check admin permissions
  const adminFids = [5431, 6099, 8109, 222144, 16098];
  const isAdmin = user?.fid && adminFids.includes(Number(user.fid));

  if (!isAdmin) {
    navigate("/profile");
    return null;
  }

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      description: "",
      imageUrl: "",
      queryType: 0,
      channelOrProfile: "",
      categoryId: 1,
      followerCount: 0,
      profile: "",
      channel: "",
      warpcastUrl: "",
      handle: "",
      fid: user?.fid ? Number(user.fid) : undefined,
      walletAddress: "",
      contractAddress: "",
      ticker: "",
    });
    setSelectedBrand(null);
    setIsEditing(false);
    setErrors({});
    setSuccessBrandId(null);
    setValidationError(null);
    setIpfsMetadataHash(null);
    setCurrentStepStatus("idle");
  };

  const goToMenu = () => {
    setCurrentStep("menu");
    resetForm();
  };

  const goToBrand = () => {
    if (successBrandId && successBrandId > 0) {
      navigate(`/brand/${successBrandId}`);
    } else {
      alert(
        "Brand ID not available. Please go back to the admin panel and search for the brand."
      );
    }
  };

  // Start adding a new brand
  const startAddBrand = () => {
    resetForm();
    setIsEditing(false);
    setCurrentStep("form");
  };

  // Start editing an existing brand
  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsEditing(true);

    // Pre-populate fields from the existing brand data
    setFormData({
      name: brand.name || "",
      url: brand.url || "",
      description: brand.description || "",
      imageUrl: brand.imageUrl || "",
      queryType: brand.queryType ?? 0,
      channelOrProfile:
        brand.queryType === 0 ? brand.channel || "" : brand.profile || "",
      categoryId: brand.category?.id || 1,
      followerCount: 0,
      profile: "",
      channel: "",
      warpcastUrl: "",
      handle: (brand as any).handle || "",
      fid: (brand as any).fid || (user?.fid ? Number(user.fid) : undefined),
      walletAddress: (brand as any).walletAddress || "",
      contractAddress: (brand as any).contractAddress || "",
      ticker: (brand as any).ticker || "",
    });
    setErrors({});
    setCurrentStep("form");
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          name === "queryType" || name === "fid" || name === "categoryId"
            ? parseInt(value) || 0
            : name === "ticker"
            ? value.replace(/^\$/, "").trim() // Remove $ prefix if user types it
            : value,
      };

      // Auto-update handle when channelOrProfile changes
      if (name === "channelOrProfile") {
        updated.handle = value.trim().toLowerCase();
      }

      return updated;
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: false,
      }));
    }

    // Clear validation error when user modifies the form
    if (validationError) {
      setValidationError(null);
    }
  };

  const validateForm = () => {
    console.log("🔍 [Admin] Starting form validation", { isEditing });
    const newErrors: Record<string, boolean> = {};

    // Basic required fields (always required)
    if (!formData.name.trim()) {
      newErrors.name = true;
      console.log("❌ [Admin] Validation failed: name is required");
    }
    // if (!formData.url.trim()) {
    //   newErrors.url = true;
    //   console.log("❌ [Admin] Validation failed: url is required");
    // }
    // if (!formData.description.trim()) {
    //   newErrors.description = true;
    //   console.log("❌ [Admin] Validation failed: description is required");
    // }
    if (!formData.channelOrProfile.trim()) {
      newErrors.channelOrProfile = true;
      console.log("❌ [Admin] Validation failed: channelOrProfile is required");
    }

    // Wallet address validation - required for both create and edit
    if (!formData.walletAddress?.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.walletAddress = true;
      console.log(
        "❌ [Admin] Validation failed: walletAddress format is invalid"
      );
    }

    // FID validation - required for both create and edit
    // if (!formData.fid || formData.fid <= 0) {
    //   newErrors.fid = true;
    //   console.log("❌ [Admin] Validation failed: fid is required");
    // }

    // Only validate handle when creating new brand (not editing)
    if (!isEditing) {
      if (!formData.handle || !formData.handle.trim()) {
        newErrors.handle = true;
        console.log(
          "❌ [Admin] Validation failed: handle is required for new brands"
        );
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log("✅ [Admin] Form validation complete", {
      isValid,
      errors: newErrors,
    });
    return isValid;
  };

  const proceedToConfirm = async () => {
    console.log("🚀 [Admin] proceedToConfirm called", {
      isEditing,
      selectedBrand,
    });

    // First validate form fields
    console.log("📋 [Admin] Validating form fields...");
    if (!validateForm()) {
      console.log("❌ [Admin] Form validation failed");
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setCurrentStepStatus("idle");
      return;
    }

    console.log(
      "✅ [Admin] Form validation passed, proceeding to backend validation and IPFS upload"
    );

    // Call prepare-metadata which now does validation AND IPFS upload
    // This applies to both creating new brands AND editing existing brands
    setIsValidating(true);
    setValidationError(null);
    setCurrentStepStatus("validating");

    try {
      const submitData = {
        name: formData.name,
        url: formData.url,
        warpcastUrl: formData.url,
        description: formData.description,
        imageUrl: formData.imageUrl,
        categoryId: formData.categoryId,
        followerCount: 0,
        queryType: formData.queryType,
        channelOrProfile: formData.channelOrProfile,
        profile: formData.profile,
        channel: formData.channel,
        handle:
          formData.handle || formData.channelOrProfile.trim().toLowerCase(),
        fid: formData.fid || (user?.fid ? Number(user.fid) : 0),
        walletAddress: formData.walletAddress || "",
        contractAddress: formData.contractAddress,
        ticker: formData.ticker,
        isEditing: isEditing,
        ...(isEditing && selectedBrand ? { brandId: selectedBrand.id } : {}),
      };

      console.log("📤 [Admin] Submitting data to prepare-metadata endpoint", {
        isEditing,
        brandId: isEditing && selectedBrand ? selectedBrand.id : undefined,
        submitData,
      });

      // Step 1: Backend validation
      console.log("🔍 [Admin] Step 1: Backend validation...");
      setCurrentStepStatus("validating");

      // Step 2: IPFS upload (happens in the same API call)
      console.log("☁️ [Admin] Step 2: Uploading to IPFS...");
      setCurrentStepStatus("uploading-ipfs");

      // This now does validation AND IPFS upload in one call
      const result = await prepareBrandMetadata(submitData);

      console.log("📥 [Admin] Received response from prepare-metadata", result);

      if (!result.valid) {
        // Handle validation errors - show them to user
        const errorMessage =
          result.message ||
          (result.conflicts && result.conflicts.length > 0
            ? `Conflicts found: ${result.conflicts.join(", ")}`
            : "Brand validation failed. Please check for conflicts or duplicates.");
        console.error("❌ [Admin] Backend validation failed", {
          errorMessage,
          result,
        });
        setValidationError(errorMessage);
        setCurrentStepStatus("idle");
        return;
      }

      // Success! Store the IPFS hash for contract creation
      if (result.metadataHash) {
        console.log("✅ [Admin] IPFS upload successful", {
          metadataHash: result.metadataHash,
        });
        setIpfsMetadataHash(result.metadataHash);
        setCurrentStepStatus("ready-for-contract");

        // Proceed to confirmation step
        console.log(
          "✅ [Admin] All validation and IPFS upload complete, proceeding to confirmation"
        );
        setCurrentStep("confirm");
      } else {
        throw new Error("IPFS metadata hash not returned from backend");
      }
    } catch (error: any) {
      console.error("❌ [Admin] Validation/IPFS error:", error);
      console.error("❌ [Admin] Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      setValidationError(
        error.message || "Failed to prepare brand metadata. Please try again."
      );
      setCurrentStepStatus("idle");
    } finally {
      setIsValidating(false);
    }
  };

  const handleFinalSubmit = async () => {
    console.log("🚀 [Admin] handleFinalSubmit called", {
      isEditing,
      isConnected,
      ipfsMetadataHash,
    });

    if (!isConnected) {
      alert("Please connect your wallet to create a brand on-chain.");
      return;
    }

    if (!ipfsMetadataHash) {
      console.error("❌ [Admin] IPFS metadata hash not found");
      alert("IPFS metadata hash not found. Please go back and try again.");
      return;
    }

    try {
      if (isEditing && selectedBrand) {
        // For editing, use the on-chain update flow (same as create, but with isEditing: true)
        const fid = formData.fid || (user?.fid ? Number(user.fid) : 0);
        const brandWalletAddress = formData.walletAddress;

        console.log("📤 [Admin] Updating brand on-chain...", {
          brandId: selectedBrand.id,
          metadataHash: ipfsMetadataHash,
          fid,
          walletAddress: brandWalletAddress,
        });

        if (!brandWalletAddress) {
          throw new Error("Wallet address is required");
        }

        if (!fid || fid <= 0) {
          throw new Error("Valid FID is required");
        }

        console.log("📝 [Admin] Calling updateBrandOnChain contract function");
        setCurrentStepStatus("ready-for-contract");

        // Update brand on-chain with the IPFS hash we already have
        await updateBrandOnChain(
          selectedBrand.id,
          ipfsMetadataHash,
          fid,
          brandWalletAddress
        );

        console.log("✅ [Admin] updateBrandOnChain transaction submitted");
        // Success will be handled by onBrandUpdateSuccess callback
        // which will set currentStep to "success"
      } else {
        const handle =
          formData.handle || formData.channelOrProfile.trim().toLowerCase();
        const fid = formData.fid || (user?.fid ? Number(user.fid) : 0);
        const brandWalletAddress = formData.walletAddress;

        console.log("📤 [Admin] Creating brand on-chain...", {
          handle,
          metadataHash: ipfsMetadataHash,
          fid,
          walletAddress: brandWalletAddress,
        });

        if (!brandWalletAddress) {
          throw new Error("Wallet address is required");
        }

        if (!fid || fid <= 0) {
          throw new Error("Valid FID is required");
        }

        if (!handle || handle.trim() === "") {
          throw new Error("Brand handle is required");
        }

        console.log("📝 [Admin] Calling createBrandOnChain contract function");
        setCurrentStepStatus("ready-for-contract");

        // Create brand on-chain with the IPFS hash we already have
        await createBrandOnChain(
          handle,
          ipfsMetadataHash,
          fid,
          brandWalletAddress
        );

        console.log("✅ [Admin] createBrandOnChain transaction submitted");
        // Success will be handled by onBrandCreateSuccess callback
        // which will set currentStep to "success"
      }
    } catch (error: any) {
      console.error("❌ [Admin] Error in handleFinalSubmit:", error);
      console.error("❌ [Admin] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      setCurrentStepStatus("idle");
      alert(error.message || "Something went wrong. Please try again.");
    }
  };

  // MENU SCREEN
  if (currentStep === "menu") {
    return (
      <AppLayout>
        <div className={styles.screen}>
          <div className={styles.header}>
            <Typography size={24} weight="bold">
              Admin Panel
            </Typography>
            <Button
              caption="← Profile"
              variant="secondary"
              onClick={() => navigate("/profile")}
            />
          </div>

          <div className={styles.menuActions}>
            <Button
              caption="➕ Add New Brand"
              variant="primary"
              onClick={startAddBrand}
              className={styles.bigButton}
            />

            <div className={styles.divider}>
              <Typography size={14} variant="druk" weight="wide">
                OR
              </Typography>
            </div>

            <Typography
              size={16}
              weight="medium"
              className={styles.instruction}
            >
              👇 Tap any brand below to edit it
            </Typography>
          </div>

          <div className={styles.brandsSection}>
            <AdminBrandsList onBrandSelect={handleBrandSelect} />
          </div>
        </div>
      </AppLayout>
    );
  }

  // FORM MODAL (Add or Edit)
  if (currentStep === "form") {
    return (
      <AppLayout>
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <Typography size={20} weight="bold">
                {isEditing ? `Edit: ${selectedBrand?.name}` : "Add New Brand"}
              </Typography>
              <Button
                caption="✕ Cancel"
                variant="secondary"
                onClick={goToMenu}
              />
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Brand Name *
                </Typography>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Nike"
                  className={`${styles.input} ${
                    errors.name ? styles.inputError : ""
                  }`}
                  required
                />
                {errors.name && (
                  <Typography size={12} className={styles.errorText}>
                    Brand name is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Website *
                </Typography>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className={`${styles.input} ${
                    errors.url ? styles.inputError : ""
                  }`}
                  required
                />
                {errors.url && (
                  <Typography size={12} className={styles.errorText}>
                    Website URL is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Description *
                </Typography>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of what this brand does..."
                  className={`${styles.textarea} ${
                    errors.description ? styles.inputError : ""
                  }`}
                  rows={3}
                  required
                />
                {errors.description && (
                  <Typography size={12} className={styles.errorText}>
                    Description is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Logo Image URL
                </Typography>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/logo.png"
                  className={styles.input}
                />
                {formData.imageUrl && (
                  <div className={styles.imagePreview}>
                    <Typography size={14} weight="medium">
                      Preview:
                    </Typography>
                    <img
                      src={formData.imageUrl}
                      alt="Brand logo preview"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Contract Address
                </Typography>
                <input
                  type="text"
                  name="contractAddress"
                  value={formData.contractAddress || ""}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className={styles.input}
                />
                <Typography size={12} className={styles.helpText}>
                  Smart contract address for the brand token
                </Typography>
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Ticker
                </Typography>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#666",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    name="ticker"
                    value={formData.ticker || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., BRND"
                    className={styles.input}
                    style={{ paddingLeft: "28px" }}
                  />
                </div>
                <Typography size={12} className={styles.helpText}>
                  Token ticker symbol (without $ prefix)
                </Typography>
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Category *
                </Typography>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Type *
                </Typography>
                <select
                  name="queryType"
                  value={formData.queryType}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value={0}>Farcaster Channel</option>
                  <option value={1}>Farcaster Profile</option>
                </select>
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  {formData.queryType === 0
                    ? "Channel Name"
                    : "Profile Username"}
                </Typography>
                <input
                  type="text"
                  name="channelOrProfile"
                  value={formData.channelOrProfile}
                  onChange={handleInputChange}
                  placeholder={
                    formData.queryType === 0 ? "e.g., founders" : "e.g., dwr"
                  }
                  className={`${styles.input} ${
                    errors.channelOrProfile ? styles.inputError : ""
                  }`}
                />
                <Typography size={12} className={styles.helpText}>
                  {formData.queryType === 0
                    ? "The Farcaster channel name (without /)"
                    : "The Farcaster username (without @)"}
                </Typography>
                {errors.channelOrProfile && (
                  <Typography size={12} className={styles.errorText}>
                    Channel/Profile name is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Brand Handle {!isEditing && "*"}
                </Typography>
                <input
                  type="text"
                  name="handle"
                  value={
                    formData.handle ||
                    formData.channelOrProfile.trim().toLowerCase()
                  }
                  onChange={handleInputChange}
                  placeholder="e.g., founders"
                  disabled={isEditing}
                  className={`${styles.input} ${
                    errors.handle ? styles.inputError : ""
                  }`}
                />
                <Typography size={12} className={styles.helpText}>
                  {isEditing
                    ? "Handle cannot be changed (immutable on-chain)"
                    : "Unique handle for the brand (auto-filled from channel/profile)"}
                </Typography>
                {errors.handle && (
                  <Typography size={12} className={styles.errorText}>
                    Brand handle is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Brand Owner FID {!isEditing && "*"}
                </Typography>
                <input
                  type="number"
                  name="fid"
                  value={formData.fid || ""}
                  onChange={handleInputChange}
                  placeholder={"e.g., 12345"}
                  className={`${styles.input} ${
                    errors.fid ? styles.inputError : ""
                  }`}
                />
                <Typography size={12} className={styles.helpText}>
                  Farcaster ID of the brand owner (defaults to your FID)
                </Typography>
                {errors.fid && (
                  <Typography size={12} className={styles.errorText}>
                    Valid FID is required
                  </Typography>
                )}
              </div>

              <div className={styles.field}>
                <Typography size={16} weight="medium">
                  Brand Owner Wallet Address {!isEditing && "*"}
                </Typography>
                <input
                  type="text"
                  name="walletAddress"
                  value={formData.walletAddress || ""}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className={`${styles.input} ${
                    errors.walletAddress ? styles.inputError : ""
                  }`}
                />
                <Typography size={12} className={styles.helpText}>
                  Wallet address of the brand owner (defaults to connected
                  wallet)
                </Typography>
                {errors.walletAddress && (
                  <Typography size={12} className={styles.errorText}>
                    Wallet address is required
                  </Typography>
                )}
                {!isConnected && !isEditing && (
                  <Typography size={12} className={styles.errorText}>
                    Please connect your wallet
                  </Typography>
                )}
              </div>
              {validationError && (
                <div className={styles.field}>
                  <Typography
                    size={14}
                    weight="bold"
                    className={styles.errorText}
                  >
                    ⚠️ Error: {validationError}
                  </Typography>
                </div>
              )}
              {errors && Object.keys(errors).length > 0 && (
                <div className={styles.field}>
                  <Typography size={12} className={styles.errorText}>
                    Please fix the errors above before continuing.
                  </Typography>
                </div>
              )}
              <div className={styles.formActions}>
                <Button
                  caption={
                    isValidating
                      ? currentStepStatus === "validating"
                        ? "⏳ Validating..."
                        : currentStepStatus === "uploading-ipfs"
                        ? "☁️ Uploading to IPFS..."
                        : "⏳ Processing..."
                      : isEditing
                      ? "Continue →"
                      : "Continue →"
                  }
                  variant="primary"
                  onClick={proceedToConfirm}
                  disabled={(!isConnected && !isEditing) || isValidating}
                />
                {isValidating && (
                  <Typography size={12} className={styles.helpText}>
                    {currentStepStatus === "validating"
                      ? "Validating brand data with backend..."
                      : currentStepStatus === "uploading-ipfs"
                      ? "Uploading metadata to IPFS..."
                      : "Processing..."}
                  </Typography>
                )}
                {!isConnected && !isEditing && !isValidating && (
                  <Typography size={12} className={styles.errorText}>
                    Please connect your wallet to create a brand on-chain
                  </Typography>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // CONFIRMATION MODAL
  if (currentStep === "confirm") {
    return (
      <AppLayout>
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <Typography size={20} weight="bold">
                {isEditing ? "Confirm Changes" : "Confirm New Brand"}
              </Typography>
            </div>

            <div className={styles.confirmation}>
              <Typography
                size={16}
                weight="medium"
                className={styles.confirmTitle}
              >
                Please review the information:
              </Typography>

              <div className={styles.reviewCard}>
                {formData.imageUrl && (
                  <div className={styles.reviewImage}>
                    <img src={formData.imageUrl} alt={formData.name} />
                  </div>
                )}

                <div className={styles.reviewInfo}>
                  <Typography size={18} weight="bold">
                    {formData.name}
                  </Typography>
                  <Typography size={14} className={styles.reviewUrl}>
                    {formData.url}
                  </Typography>
                  <Typography size={14} className={styles.reviewDescription}>
                    {formData.description}
                  </Typography>
                  <Typography size={12} className={styles.reviewMeta}>
                    {formData.queryType === 0 ? "Channel" : "Profile"}:{" "}
                    {formData.channelOrProfile || "Not specified"}
                  </Typography>
                  <Typography size={12} className={styles.reviewMeta}>
                    Category:{" "}
                    {CATEGORIES.find((c) => c.id === formData.categoryId)
                      ?.name || "Not specified"}
                  </Typography>
                  {formData.contractAddress && (
                    <Typography size={12} className={styles.reviewMeta}>
                      Contract: {formData.contractAddress}
                    </Typography>
                  )}
                  {formData.ticker && (
                    <Typography size={12} className={styles.reviewMeta}>
                      Ticker: ${formData.ticker}
                    </Typography>
                  )}
                  {formData.handle && (
                    <Typography size={12} className={styles.reviewMeta}>
                      Handle: {formData.handle}
                    </Typography>
                  )}
                  {formData.fid && (
                    <Typography size={12} className={styles.reviewMeta}>
                      Owner FID: {formData.fid}
                    </Typography>
                  )}
                  {formData.walletAddress && (
                    <Typography size={12} className={styles.reviewMeta}>
                      Owner Wallet: {formData.walletAddress}
                    </Typography>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.confirmActions}>
              <Button
                caption="← Edit"
                variant="secondary"
                onClick={() => setCurrentStep("form")}
              />
              <Button
                caption={
                  isCreatingBrand ||
                  isUpdatingBrand ||
                  isPending ||
                  isConfirming
                    ? isEditing
                      ? "⏳ Updating on-chain..."
                      : "⏳ Creating on-chain..."
                    : isEditing
                    ? "Update Brand"
                    : "✓ Create Brand"
                }
                variant="primary"
                onClick={handleFinalSubmit}
                className={styles.confirmButton}
                disabled={
                  isCreatingBrand ||
                  isUpdatingBrand ||
                  isPending ||
                  isConfirming ||
                  (!isConnected && !isEditing) ||
                  !ipfsMetadataHash
                }
              />
              {!ipfsMetadataHash && (
                <Typography size={12} className={styles.errorText}>
                  IPFS metadata hash not available. Please go back and try
                  again.
                </Typography>
              )}
              {contractError && (
                <Typography size={12} className={styles.errorText}>
                  {contractError}
                </Typography>
              )}
              {isPending && (
                <Typography size={12} className={styles.helpText}>
                  Transaction submitted. Waiting for confirmation...
                </Typography>
              )}
              {isConfirming && (
                <Typography size={12} className={styles.helpText}>
                  Transaction confirmed! Processing...
                </Typography>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // SUCCESS MODAL
  if (currentStep === "success") {
    return (
      <AppLayout>
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <Typography size={20} weight="bold">
                🎉 Success!
              </Typography>
            </div>

            <div className={styles.successContent}>
              <Typography
                size={18}
                weight="medium"
                className={styles.successMessage}
              >
                Brand successfully {isEditing ? "updated" : "added"}!
              </Typography>

              <div className={styles.successActions}>
                {successBrandId && successBrandId > 0 && (
                  <Button
                    caption="👁️ Go to Brand"
                    variant="primary"
                    onClick={goToBrand}
                    className={styles.successButton}
                  />
                )}
                <Button
                  caption="← Back to Admin Panel"
                  variant="secondary"
                  onClick={goToMenu}
                  className={styles.successButton}
                />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return null;
}

export default AdminPage;

export const socialIconAssets = {
  facebook: "/social-icons/facebook.png",
  instagram: "/social-icons/instagram.png",
  youtube: "/social-icons/youtube.png",
  tiktok: "/social-icons/tiktok.png",
  googleReview: "/social-icons/google-review.png",
  website: "/social-icons/website.png",
} as const;

export type SocialIconAsset = keyof typeof socialIconAssets;

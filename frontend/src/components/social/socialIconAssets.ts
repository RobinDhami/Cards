import facebookIcon from './assets/facebook.png'
import googleReviewIcon from './assets/google-review.png'
import instagramIcon from './assets/instagram.png'
import tiktokIcon from './assets/tiktok.png'
import websiteIcon from './assets/website.png'
import whatsappIcon from './assets/whatsapp.png'
import youtubeIcon from './assets/youtube.png'

export const socialIconAssets = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  youtube: youtubeIcon,
  tiktok: tiktokIcon,
  googleReview: googleReviewIcon,
  website: websiteIcon,
  whatsapp: whatsappIcon,
} as const;

export type SocialIconAsset = keyof typeof socialIconAssets;

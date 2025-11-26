/**
 * Site Configuration
 * 
 * Central configuration for all site-wide branding, social links, and metadata.
 * Update these values to customize the site for your deployment.
 * 
 * This file should be the ONLY place where brand information is hardcoded.
 */

export const SITE_CONFIG = {
    // Brand Information
    brand: {
        name: 'DDN Games',
        tagline: 'Play exciting mini-games online with friends',
        description: 'Play exciting mini-games online with friends. Challenge yourself and climb the leaderboard!',
        logo: '🎮', // Emoji or path to logo image
        author: 'Do Duc Nghia',
        year: new Date().getFullYear()
    },

    // Social Media Links
    social: {
        facebook: 'https://www.facebook.com/DoDucNghia00',
        twitter: 'https://x.com/Nghia292',
        github: 'https://github.com/Doducnghia00/ddn-minigames',
        discord: null, // Set to URL or null to hide
        youtube: null,
        instagram: null
    },

    // Legal & Support Links
    links: {
        privacyPolicy: '#',
        termsOfService: '#',
        about: '#',
        support: '#',
        contact: 'doducnghia00@gmail.com' // Or null if no contact
    },

    // SEO & Meta
    seo: {
        title: 'DDN Games - Play Mini-Games Online',
        description: 'Play exciting mini-games online with friends. Challenge yourself and climb the leaderboard!',
        keywords: 'online games, mini-games, multiplayer games, caro, strategy games',
        ogImage: null, // Open Graph image URL
        twitterCard: 'summary_large_image'
    },

    // Feature Flags for UI
    features: {
        showFooter: true,
        showHeader: true,
        showSocialLinks: true,
        showQuickLinks: true,
        enableLeaderboard: false, // Future feature
        enableAchievements: false // Future feature
    },

    // Quick Links (Footer/Navigation)
    quickLinks: [
        { label: 'About Us', href: '#', enabled: true },
        { label: 'Games', href: '/lobby', enabled: true },
        { label: 'Leaderboard', href: '#', enabled: false }, // Hidden if disabled
        { label: 'Support', href: '#', enabled: true }
    ]
};

/**
 * Get social links that are enabled (not null)
 */
export function getEnabledSocialLinks() {
    const { social } = SITE_CONFIG;
    const links = [];

    if (social.facebook) links.push({ name: 'Facebook', url: social.facebook, icon: 'facebook' });
    if (social.twitter) links.push({ name: 'Twitter', url: social.twitter, icon: 'twitter' });
    if (social.github) links.push({ name: 'GitHub', url: social.github, icon: 'github' });
    if (social.discord) links.push({ name: 'Discord', url: social.discord, icon: 'discord' });
    if (social.youtube) links.push({ name: 'YouTube', url: social.youtube, icon: 'youtube' });
    if (social.instagram) links.push({ name: 'Instagram', url: social.instagram, icon: 'instagram' });

    return links;
}

/**
 * Get enabled quick links
 */
export function getEnabledQuickLinks() {
    return SITE_CONFIG.quickLinks.filter(link => link.enabled);
}

/**
 * Get copyright text
 */
export function getCopyrightText() {
    return `© ${SITE_CONFIG.brand.year} ${SITE_CONFIG.brand.name}. All rights reserved.`;
}

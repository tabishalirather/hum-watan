export const defaultSiteContent = {
	homepageTitle: "Panin Kashir community, mapped.",
	homepageDescription: "Browse verified Kashir mentors by university, field, and city.",
	contactRequestGuidance:
		"When you contact a mentor, a short and thoughtful introduction helps set the tone. Share who you are, what stage you're at in your admissions journey, and the specific question you'd like help with. Keep your message focused, kind, and mindful of their time. Avoid anything demanding, overly personal, or unrelated, and try not to send repeated follow-ups.",
	contactRequestExamples:
		"Hi, I'm Tabish, a recent graduate exploring a Master's in software engineering. I'm reaching out because I have a question about strengthening my personal statement.\n\nHi, I'm Insha, applying for Master's programs in public policy. I'd appreciate guidance on whether my experience aligns with the programs I'm targeting.\n\nHello, I'm Aamir, applying to engineering schools in Europe. I'm unsure how to present my project experience in a way that stands out.",
};

export type SiteContent = typeof defaultSiteContent;
export type SiteContentSettings = Partial<Record<keyof SiteContent, string | null>>;

export function getSiteContent(settings: SiteContentSettings | null | undefined): SiteContent {
	return {
		homepageTitle: settings?.homepageTitle || defaultSiteContent.homepageTitle,
		homepageDescription: settings?.homepageDescription || defaultSiteContent.homepageDescription,
		contactRequestGuidance: settings?.contactRequestGuidance || defaultSiteContent.contactRequestGuidance,
		contactRequestExamples: settings?.contactRequestExamples || defaultSiteContent.contactRequestExamples,
	};
}
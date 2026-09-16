import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_dummy_key';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && POSTHOG_KEY !== 'phc_dummy_key') {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false // We will handle pageviews manually in router
  });
}

export default posthog;

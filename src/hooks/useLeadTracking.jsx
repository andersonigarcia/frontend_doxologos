import { useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useEventTracking } from '@/hooks/useAnalytics';

/**
 * Custom hook for tracking lead magnet interactions and conversions
 * Integrates with analytics and persists data to database
 */
export const useLeadTracking = () => {
    const trackEvent = useEventTracking();

    /**
     * Track when a lead magnet modal is viewed
     */
    const trackLeadMagnetView = useCallback((magnetType, metadata = {}) => {
        trackEvent('lead_magnet_view', {
            magnet_type: magnetType,
            source_page: window.location.pathname,
            ...metadata
        });
    }, [trackEvent]);

    /**
     * Track when a lead magnet form is submitted
     * Also persists to database
     */
    const trackLeadMagnetSubmit = useCallback(async (magnetType, leadData, metadata = {}) => {
        const { email, name, phone } = leadData;

        // Track analytics event
        trackEvent('lead_magnet_submit', {
            magnet_type: magnetType,
            source_page: window.location.pathname,
            has_phone: !!phone,
            ...metadata
        });

        // Persist to database
        try {
            const { data, error } = await supabase
                .from('leads')
                .insert({
                    email,
                    name,
                    phone,
                    lead_magnet_type: magnetType,
                    source_page: window.location.pathname,
                    metadata: {
                        ...metadata,
                        user_agent: navigator.userAgent,
                        referrer: document.referrer,
                        timestamp: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving lead to database:', error);
                // Don't throw - we don't want to block the user flow
                trackEvent('lead_save_error', {
                    magnet_type: magnetType,
                    error_message: error.message
                });
                return null;
            }

            trackEvent('lead_save_success', {
                magnet_type: magnetType,
                lead_id: data.id
            });

            return data;
        } catch (error) {
            console.error('Unexpected error saving lead:', error);
            return null;
        }
    }, [trackEvent]);

    /**
     * Track when a lead converts to a booking
     */
    const trackLeadConversion = useCallback(async (email, bookingId) => {
        trackEvent('lead_conversion', {
            email,
            booking_id: bookingId
        });

        // Update lead record in database
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    converted_to_booking: true,
                    booking_id: bookingId
                })
                .eq('email', email)
                .eq('converted_to_booking', false); // Only update if not already converted

            if (error) {
                console.error('Error updating lead conversion:', error);
            }
        } catch (error) {
            console.error('Unexpected error updating lead conversion:', error);
        }
    }, [trackEvent]);

    /**
     * Track when exit-intent popup is triggered
     */
    const trackExitIntentTrigger = useCallback((metadata = {}) => {
        trackEvent('exit_intent_trigger', {
            source_page: window.location.pathname,
            time_on_page: metadata.timeOnPage || 0,
            scroll_depth: metadata.scrollDepth || 0,
            ...metadata
        });
    }, [trackEvent]);

    /**
     * Track when a landing page is viewed
     */
    const trackLandingPageView = useCallback((pageName, metadata = {}) => {
        trackEvent('landing_page_view', {
            page_name: pageName,
            source_page: window.location.pathname,
            referrer: document.referrer,
            ...metadata
        });
    }, [trackEvent]);

    /**
     * Track CTA clicks on landing pages
     */
    const trackLandingPageCTA = useCallback((ctaType, pageName, metadata = {}) => {
        trackEvent('landing_page_cta_click', {
            cta_type: ctaType,
            page_name: pageName,
            source_page: window.location.pathname,
            ...metadata
        });
    }, [trackEvent]);

    /**
     * Track video plays in video section
     */
    const trackVideoEngagement = useCallback((videoId, videoTitle, action, metadata = {}) => {
        trackEvent('video_engagement', {
            video_id: videoId,
            video_title: videoTitle,
            action, // 'play', 'pause', 'complete', etc.
            source_page: window.location.pathname,
            ...metadata
        });
    }, [trackEvent]);

    return {
        trackLeadMagnetView,
        trackLeadMagnetSubmit,
        trackLeadConversion,
        trackExitIntentTrigger,
        trackLandingPageView,
        trackLandingPageCTA,
        trackVideoEngagement
    };
};

export default useLeadTracking;

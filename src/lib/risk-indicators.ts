
import { supabase } from './supabase';
import { getRiskById } from './risks';
import { getCurrentUser } from './auth';

export interface RiskIndicator {
    id: string; // link id
    kri_id: string;
    risk_id: string;
    ai_link_confidence: number | null;
    linked_at: string;
    kri_definition: {
        kri_name: string;
        kri_code: string;
        indicator_type: 'leading' | 'lagging' | 'concurrent';
        measurement_unit: string;
        collection_frequency: string;
        lower_threshold: number | null;
        upper_threshold: number | null;
        target_value: number | null;
        threshold_direction: string;
    };
}

export interface CreateAndLinkKRIParams {
    riskId: string; // We'll fetch risk_code from this
    kriData: {
        kri_name: string;
        description: string;
        indicator_type: string; // 'leading', 'lagging', 'concurrent'
        measurement_unit: string;
        collection_frequency: string;
        lower_threshold?: number;
        upper_threshold?: number;
        target_value?: number;
        threshold_direction?: string;
    };
    linkData: {
        coverage_strength?: string; // Not supported in DB, will be ignored or logged
        rationale?: string; // Not supported in DB, will be ignored
        ai_link_confidence?: number;
    };
}

export async function getRiskIndicators(riskId: string) {
    // We need to fetch the KRI definition details as well
    const { data, error } = await supabase
        .from('kri_risk_links')
        .select(`
      id,
      risk_id,
      kri_id,
      ai_link_confidence,
      created_at,
      kri:kri_definitions (
        kri_name,
        kri_code,
        indicator_type,
        measurement_unit,
        collection_frequency,
        lower_threshold,
        upper_threshold,
        target_value,
        threshold_direction
      )
    `)
        .eq('risk_id', riskId);

    if (error) {
        console.error('Error fetching risk indicators:', error);
        return { data: null, error };
    }

    // Map response to flatter structure
    // Note: the join might return 'kri' as an array or object depending on relationship. Usually object for foreign key.
    const indicators = data.map((item: any) => ({
        id: item.id,
        kri_id: item.kri_id,
        risk_id: item.risk_id,
        ai_link_confidence: item.ai_link_confidence,
        linked_at: item.created_at,
        // Map 'kri' object to 'kri_definition'
        kri_definition: item.kri
    }));

    return { data: indicators, error: null };
}

export async function createAndLinkKRI({ riskId, kriData, linkData }: CreateAndLinkKRIParams) {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Get Risk Code & Org ID (needed for KRI creation)
    const { data: risk, error: riskError } = await getRiskById(riskId);
    if (riskError || !risk) throw new Error('Risk not found');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile) throw new Error('User profile not found');

    // 2. Create KRI in Definitions Table
    // Generate a code if DB doesn't auto-gen (DB schema implies we provide it)
    const kriCode = `KRI-${Date.now().toString().slice(-6)}`;

    const { data: newKRI, error: createError } = await supabase
        .from('kri_definitions')
        .insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            kri_code: kriCode,
            kri_name: kriData.kri_name,
            description: kriData.description,
            indicator_type: kriData.indicator_type,
            measurement_unit: kriData.measurement_unit,
            collection_frequency: kriData.collection_frequency,
            lower_threshold: kriData.lower_threshold || null,
            upper_threshold: kriData.upper_threshold || null,
            target_value: kriData.target_value || null,
            threshold_direction: kriData.threshold_direction || 'above'
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating KRI:', createError);
        return { data: null, error: createError };
    }

    // 3. Link to Risk using risk_id (UUID)
    const { data: link, error: linkError } = await supabase
        .from('kri_risk_links')
        .insert({
            risk_id: riskId,
            kri_id: newKRI.id,
            ai_link_confidence: linkData.ai_link_confidence || null,
            linked_by: user.id
        })
        .select()
        .single();

    if (linkError) {
        console.error('Error linking KRI:', linkError);
        // Best effort rollback - try to delete the orphaned KRI definition
        await supabase.from('kri_definitions').delete().eq('id', newKRI.id);
        return { data: null, error: linkError };
    }

    return { data: { ...link, ...newKRI }, error: null };
}

export async function unlinkRiskIndicator(linkId: string) {
    // Note: linkId is the ID of the LINK record in kri_risk_links
    const { error } = await supabase
        .from('kri_risk_links')
        .delete()
        .eq('id', linkId);

    return { error };
}

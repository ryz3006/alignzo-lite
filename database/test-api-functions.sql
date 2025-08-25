-- Test API Functions
-- This script will test the new API functions to ensure they're working correctly

-- 1. Test the API function
SELECT 
    'API Function Test' as test_name,
    get_project_categories_with_options_api('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) as result;

-- 2. Test the direct function
SELECT 
    'Direct Function Test' as test_name,
    get_project_categories_direct('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) as result;

-- 3. Test with detailed output
DO $$
DECLARE
    api_result JSON;
    direct_result JSON;
    api_count INTEGER;
    direct_count INTEGER;
BEGIN
    -- Test API function
    SELECT get_project_categories_with_options_api('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) INTO api_result;
    
    IF api_result IS NOT NULL AND json_array_length(api_result) > 0 THEN
        api_count := json_array_length(api_result);
        RAISE NOTICE '✅ API function working: Found % categories', api_count;
        
        -- Show first category details
        RAISE NOTICE 'First category: %', api_result->0;
        
        -- Show options count for first category
        IF api_result->0->'options' IS NOT NULL THEN
            RAISE NOTICE 'Options in first category: %', json_array_length(api_result->0->'options');
        END IF;
    ELSE
        RAISE NOTICE '❌ API function returned empty result';
    END IF;
    
    -- Test direct function
    SELECT get_project_categories_direct('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) INTO direct_result;
    
    IF direct_result IS NOT NULL AND json_array_length(direct_result) > 0 THEN
        direct_count := json_array_length(direct_result);
        RAISE NOTICE '✅ Direct function working: Found % categories', direct_count;
        
        -- Show first category details
        RAISE NOTICE 'First category: %', direct_result->0;
        
        -- Show options count for first category
        IF direct_result->0->'options' IS NOT NULL THEN
            RAISE NOTICE 'Options in first category: %', json_array_length(direct_result->0->'options');
        END IF;
    ELSE
        RAISE NOTICE '❌ Direct function returned empty result';
    END IF;
    
    -- Compare results
    IF api_result = direct_result THEN
        RAISE NOTICE '✅ Both functions return identical results';
    ELSE
        RAISE NOTICE '⚠️ Functions return different results';
    END IF;
END $$;

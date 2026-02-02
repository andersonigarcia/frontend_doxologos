
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN 
        SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
              AND rc.constraint_schema = tc.table_schema
        WHERE tc.table_name = 'inscricoes_eventos' AND ccu.table_name = 'eventos'
    LOOP
        RAISE NOTICE 'Constraint: %, Delete Rule: %', fk_record.constraint_name, fk_record.delete_rule;
    END LOOP;
END $$;

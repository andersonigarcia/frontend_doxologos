import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const PatientAcompanhamento = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.email) return;

        const loadTasks = async () => {
            setLoading(true);
            try {
                // RLS garante que o paciente só consiga ler se auth.email() = patient_email E homework_visible_to_patient = true
                const { data, error } = await supabase
                    .from('patient_notes_history')
                    .select('id, session_date, homework, professional_id')
                    .eq('patient_email', user.email)
                    .order('session_date', { ascending: false });

                if (error) throw error;
                setTasks(data || []);
            } catch (err) {
                console.error('Erro ao carregar tarefas:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadTasks();
    }, [user?.email]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Buscando seu acompanhamento...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium">Não foi possível carregar as informações</h3>
                    <p className="text-sm opacity-90 mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Nenhum acompanhamento liberado</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    As tarefas e notas de acompanhamento que o seu profissional de saúde liberar para você aparecerão aqui.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <BookOpen className="w-6 h-6" />
                    <span>Meu Acompanhamento</span>
                </h2>
                <p className="mt-2 text-emerald-50 max-w-2xl">
                    Revise as tarefas e recomendações deixadas pelo seu profissional para dar continuidade ao seu desenvolvimento entre as sessões.
                </p>
            </div>

            <div className="space-y-4">
                {tasks.map((task, index) => {
                    const dateObj = new Date(task.session_date);
                    const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000));
                    
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={task.id}
                            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                            
                            <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 mb-4 bg-emerald-50 inline-flex px-3 py-1.5 rounded-lg">
                                <Calendar className="w-4 h-4" />
                                <span>Sessão de {formattedDate}</span>
                            </div>
                            
                            <div className="prose prose-emerald max-w-none text-gray-700 whitespace-pre-wrap">
                                {task.homework || 'Nenhuma tarefa descrita para esta sessão.'}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

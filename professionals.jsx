<TabsContent value="professionals" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                                <h2 className="text-2xl font-bold mb-6 flex items-center">
                                                    <Users className="w-6 h-6 mr-2 text-[#2d8659]" />
                                                    {userRole === 'admin' ? 'Profissionais' : 'Meu Perfil'}
                                                </h2>
                                                <div className="space-y-4">
                                                    {professionals.map((prof, index) => (
                                                        <div key={prof.id} className={`border rounded-lg p-6 hover:shadow-md transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                            } hover:bg-blue-50`}>
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        {prof.image_url && (
                                                                            <img
                                                                                src={prof.image_url}
                                                                                alt={prof.name}
                                                                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                                                            />
                                                                        )}
                                                                        <div>
                                                                            <h3 className="font-bold text-lg text-gray-900">{prof.name}</h3>
                                                                            {prof.email && (
                                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                                    📧 {prof.email}
                                                                                </p>
                                                                            )}
                                                                            {(prof.whatsapp || prof.phone) && (
                                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                                    📱 {prof.whatsapp || prof.phone}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Serviços</h4>
                                                                            {prof.services_ids && prof.services_ids.length > 0 ? (
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {prof.services_ids.map(serviceId => {
                                                                                        const service = services.find(s => s.id === serviceId);
                                                                                        return service ? (
                                                                                            <span key={serviceId} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                                                {service.name}
                                                                                            </span>
                                                                                        ) : null;
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-orange-500 text-sm">Nenhum serviço atribuído</span>
                                                                            )}
                                                                        </div>

                                                                        {prof.mini_curriculum && (
                                                                            <div>
                                                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Minicurrículo</h4>
                                                                                <p className="text-sm text-gray-600 line-clamp-3">
                                                                                    {prof.mini_curriculum.length > 150
                                                                                        ? `${prof.mini_curriculum.substring(0, 150)}...`
                                                                                        : prof.mini_curriculum
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2 ml-4">
                                                                    <Button size="icon" variant="ghost" onClick={() => handleEditProfessional(prof)} title="Editar profissional">
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    {userRole === 'admin' && (
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleDeleteProfessional(prof.id)}
                                                                            className="hover:bg-red-50"
                                                                            title="Excluir profissional"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                <h2 className="text-2xl font-bold mb-6">
                                                    {userRole === 'admin'
                                                        ? (isEditingProfessional ? 'Editar Profissional' : 'Novo Profissional')
                                                        : 'Editar Meu Perfil'
                                                    }
                                                </h2>
                                                <form onSubmit={handleProfessionalSubmit} className="space-y-4 text-sm">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Nome do Profissional</label>
                                                        <input
                                                            name="name"
                                                            value={professionalFormData.name}
                                                            onChange={e => setProfessionalFormData({ ...professionalFormData, name: e.target.value })}
                                                            placeholder="Ex: Dr. João Silva"
                                                            className="w-full input rounded-2xl"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Serviços que Atende</label>
                                                        <div className="border border-gray-200 rounded-2xl p-4 max-h-48 overflow-y-auto bg-gray-50">
                                                            {services.map(service => (
                                                                <label key={service.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-100 px-2 rounded">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={professionalFormData.services_ids?.includes(service.id)}
                                                                        onChange={e => {
                                                                            const currentServices = professionalFormData.services_ids || [];
                                                                            if (e.target.checked) {
                                                                                setProfessionalFormData({
                                                                                    ...professionalFormData,
                                                                                    services_ids: [...currentServices, service.id]
                                                                                });
                                                                            } else {
                                                                                setProfessionalFormData({
                                                                                    ...professionalFormData,
                                                                                    services_ids: currentServices.filter(id => id !== service.id)
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="checkbox"
                                                                    />
                                                                    <span>{service.name} (R$ {service.price})</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">Selecione um ou mais serviços que este profissional pode atender</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Email</label>
                                                        <input
                                                            name="email"
                                                            value={professionalFormData.email}
                                                            onChange={e => setProfessionalFormData({ ...professionalFormData, email: e.target.value })}
                                                            type="email"
                                                            placeholder="joao@clinica.com"
                                                            className="w-full input"
                                                            disabled={userRole === 'admin' && isEditingProfessional}
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">WhatsApp / Celular (com DDD)</label>
                                                        <input
                                                            name="whatsapp"
                                                            value={professionalFormData.whatsapp || professionalFormData.phone || ''}
                                                            onChange={e => setProfessionalFormData({ ...professionalFormData, whatsapp: e.target.value, phone: e.target.value })}
                                                            type="text"
                                                            placeholder="5531999999999"
                                                            className="w-full input"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">Utilizado para receber notificações urgentes de agendamento</p>
                                                    </div>

                                                    {(userRole === 'admin' || !isEditingProfessional) && (
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1 text-gray-600">Senha</label>
                                                            <input
                                                                name="password"
                                                                value={professionalFormData.password}
                                                                onChange={e => setProfessionalFormData({ ...professionalFormData, password: e.target.value })}
                                                                type="password"
                                                                placeholder={isEditingProfessional ? 'Defina uma nova senha (opcional)' : '******'}
                                                                className="w-full input"
                                                                required={!isEditingProfessional}
                                                            />
                                                            {isEditingProfessional && userRole === 'admin' && (
                                                                <p className="text-xs text-gray-500 mt-1">{`Deixe em blank para manter a senha atual (mínimo ${MIN_PROFESSIONAL_PASSWORD_LENGTH} caracteres).`}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Foto do Profissional</label>
                                                    {/* Upload de arquivo local */}
                                                    <div className="mb-3">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    // Verificar tamanho do arquivo (máximo 5MB)
                                                                    if (file.size > 5 * 1024 * 1024) {
                                                                        toast({
                                                                            variant: 'destructive',
                                                                            title: 'Arquivo muito grande',
                                                                            description: 'Por favor, selecione uma imagem menor que 5MB'
                                                                        });
                                                                        return;
                                                                    }

                                                                    try {
                                                                        toast({ title: 'Fazendo upload...', description: 'Processando e enviando imagem...' });

                                                                        // Gerar nome único para o arquivo
                                                                        const fileExt = file.name.split('.').pop();
                                                                        const fileName = `professional_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                                        const filePath = `professionals/${fileName}`;

                                                                        // Processar e comprimir imagem antes do upload
                                                                        const canvas = document.createElement('canvas');
                                                                        const ctx = canvas.getContext('2d');
                                                                        const img = new Image();

                                                                        img.onload = async () => {
                                                                            // Redimensionar para alta qualidade (800px max)
                                                                            const maxSize = 800;
                                                                            let { width, height } = img;

                                                                            if (width > height) {
                                                                                if (width > maxSize) {
                                                                                    height = (height * maxSize) / width;
                                                                                    width = maxSize;
                                                                                }
                                                                            } else {
                                                                                if (height > maxSize) {
                                                                                    width = (width * maxSize) / height;
                                                                                    height = maxSize;
                                                                                }
                                                                            }

                                                                            canvas.width = width;
                                                                            canvas.height = height;

                                                                            ctx.imageSmoothingEnabled = true;
                                                                            ctx.imageSmoothingQuality = 'high';
                                                                            ctx.drawImage(img, 0, 0, width, height);

                                                                            // Converter para blob com boa qualidade
                                                                            canvas.toBlob(async (blob) => {
                                                                                if (!blob) {
                                                                                    toast({ variant: 'destructive', title: 'Erro ao processar imagem' });
                                                                                    return;
                                                                                }

                                                                                // Remover imagem anterior se existir
                                                                                if (professionalFormData.image_url && professionalFormData.image_url.includes('supabase')) {
                                                                                    const oldPath = professionalFormData.image_url.split('/').slice(-2).join('/');
                                                                                    await supabase.storage.from('professional-photos').remove([oldPath]);
                                                                                }

                                                                                // Upload para Supabase Storage
                                                                                const { data, error } = await supabase.storage
                                                                                    .from('professional-photos')
                                                                                    .upload(filePath, blob, {
                                                                                        cacheControl: '3600',
                                                                                        upsert: false
                                                                                    });

                                                                                if (error) {
                                                                                    secureLog.error('Erro no upload da foto do profissional:', error?.message || error);
                                                                                    secureLog.debug('Detalhes do erro no upload da foto do profissional', error);
                                                                                    toast({
                                                                                        variant: 'destructive',
                                                                                        title: 'Erro no upload',
                                                                                        description: 'Não foi possível fazer upload da imagem: ' + error.message
                                                                                    });
                                                                                    return;
                                                                                }

                                                                                // Obter URL pública
                                                                                const { data: urlData } = supabase.storage
                                                                                    .from('professional-photos')
                                                                                    .getPublicUrl(filePath);

                                                                                if (urlData?.publicUrl) {
                                                                                    setProfessionalFormData({
                                                                                        ...professionalFormData,
                                                                                        image_url: urlData.publicUrl
                                                                                    });

                                                                                    toast({
                                                                                        title: 'Upload concluído!',
                                                                                        description: `Imagem de alta qualidade salva (${Math.round(width)}x${Math.round(height)}px)`
                                                                                    });
                                                                                } else {
                                                                                    toast({
                                                                                        variant: 'destructive',
                                                                                        title: 'Erro ao obter URL',
                                                                                        description: 'Upload realizado mas não foi possível obter a URL'
                                                                                    });
                                                                                }
                                                                            }, 'image/jpeg', 0.85);
                                                                        };

                                                                        img.onerror = () => {
                                                                            toast({
                                                                                variant: 'destructive',
                                                                                title: 'Erro ao processar imagem',
                                                                                description: 'Não foi possível carregar o arquivo selecionado'
                                                                            });
                                                                        };

                                                                        img.src = URL.createObjectURL(file);

                                                                    } catch (error) {
                                                                        secureLog.error('Erro no upload da foto do profissional:', error?.message || error);
                                                                        secureLog.debug('Detalhes do erro no upload da foto do profissional', error);
                                                                        toast({
                                                                            variant: 'destructive',
                                                                            title: 'Erro no upload',
                                                                            description: 'Não foi possível processar a imagem: ' + error.message
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#2d8659] file:text-white hover:file:bg-[#236b47] file:cursor-pointer"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">Upload seguro para Supabase Storage com alta qualidade (até 5MB)</p>
                                                    </div>

                                                    {/* Campo de URL alternativo */}
                                                    <div className="mb-3">
                                                        <input
                                                            name="image_url"
                                                            value={professionalFormData.image_url && professionalFormData.image_url.startsWith('data:') ? '' : professionalFormData.image_url}
                                                            onChange={e => setProfessionalFormData({ ...professionalFormData, image_url: e.target.value })}
                                                            type="url"
                                                            placeholder="Ou cole o link direto: https://exemplo.com/foto.jpg"
                                                            className="w-full input text-sm"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">Alternativa: cole um link direto para a imagem</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Link Fixo do Google Meet</label>
                                                        <Input
                                                            value={professionalFormData.personal_meet_link || ''}
                                                            placeholder="https://meet.google.com/abc-defg-hij"
                                                            onChange={(e) => setProfessionalFormData({ ...professionalFormData, personal_meet_link: e.target.value })}
                                                        />
                                                        <p className="text-xs text-gray-500">
                                                            Link permanente que será enviado aos pacientes quando agendarem consultas pelo Google Meet com este profissional.
                                                        </p>
                                                    </div>

                                                    {/* Preview da imagem */}
                                                    {professionalFormData.image_url && (
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <img
                                                                src={professionalFormData.image_url}
                                                                alt="Preview"
                                                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">Preview da foto</p>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setProfessionalFormData({ ...professionalFormData, image_url: '' })}
                                                                    className="mt-1 text-xs"
                                                                >
                                                                    Remover foto
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Mini-currículo</label>
                                                    <textarea
                                                        name="mini_curriculum"
                                                        value={professionalFormData.mini_curriculum}
                                                        onChange={e => setProfessionalFormData({ ...professionalFormData, mini_curriculum: e.target.value })}
                                                        placeholder="Formação, experiências, especializações..."
                                                        className="w-full input"
                                                        rows="5"
                                                    ></textarea>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]" disabled={isSavingProfessionalProfile}>
                                                        {isSavingProfessionalProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        {userRole === 'admin'
                                                            ? (isEditingProfessional ? 'Salvar' : 'Criar')
                                                            : 'Salvar Alterações'
                                                        }
                                                    </Button>
                                                    {userRole === 'admin' && isEditingProfessional && (
                                                        <Button type="button" variant="outline" onClick={resetProfessionalForm}>
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    {userRole !== 'admin' && (
                                        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                                            <h3 className="text-xl font-semibold mb-2">Alterar senha de acesso</h3>
                                            <p className="text-sm text-gray-600 mb-4">
                                                Defina uma nova senha segura para acessar o painel profissional.
                                            </p>
                                            <form onSubmit={handleProfessionalPasswordChange} className="space-y-4 text-sm max-w-xl">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Nova senha</label>
                                                        <input
                                                            type="password"
                                                            value={passwordFormData.newPassword}
                                                            onChange={(e) => setPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                            placeholder="Mínimo de 6 caracteres"
                                                            className="w-full input"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Confirmar nova senha</label>
                                                        <input
                                                            type="password"
                                                            value={passwordFormData.confirmPassword}
                                                            onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                            placeholder="Repita a nova senha"
                                                            className="w-full input"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <Button type="submit" className="bg-[#2d8659] hover:bg-[#236b47]" disabled={isSavingPassword}>
                                                    {isSavingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Atualizar senha
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                </Suspense>
</TabsContent>
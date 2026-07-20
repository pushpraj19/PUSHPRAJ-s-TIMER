// Supabase Sync & Profile Widget Library for FOCUS
// Loaded on all pages to handle user authentication, real-time syncing, and avatar display.

(function() {
    // 1. Initialize Supabase Client
    let client = null;
    const isConfigured = window.SUPABASE_URL && window.SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
                        window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

    if (isConfigured) {
        try {
            client = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            window.supabaseClient = client;
        } catch (e) {
            console.error("Supabase client initialization failed:", e);
        }
    } else {
        console.warn("Supabase is not configured. Falling back to local offline storage.");
    }

    // Expose Database APIs globally
    window.supabaseDb = {
        isConfigured: () => isConfigured,
        
        isLoggedIn: async () => {
            if (!client) return false;
            const { data } = await client.auth.getSession();
            return !!data.session;
        },

        getCurrentUser: async () => {
            if (!client) return null;
            const { data } = await client.auth.getUser();
            return data.user;
        },

        logout: async () => {
            if (!client) return;
            await client.auth.signOut();
            localStorage.removeItem('auth_continue_without_account');
            window.location.href = 'index.html';
        },

        // Profile & Theme Settings Sync
        fetchProfile: async () => {
            if (!client) return null;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return null;
            
            const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (error) console.error("Error fetching profile:", error);
            return data;
        },

        saveProfilePicture: async (avatarData) => {
            if (!client) return false;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return false;

            const { error } = await client.from('profiles').upsert({
                id: user.id,
                avatar_data: avatarData,
                updated_at: new Date().toISOString()
            });

            if (error) {
                console.error("Error saving profile picture:", error);
                return false;
            }
            return true;
        },

        saveSceneState: async (sceneStateObj) => {
            if (!client) return false;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return false;

            const { error } = await client.from('profiles').upsert({
                id: user.id,
                scene_state: JSON.stringify(sceneStateObj),
                updated_at: new Date().toISOString()
            });

            if (error) {
                console.error("Error saving scene state:", error);
                return false;
            }
            return true;
        },

        // Todos Sync
        fetchTodos: async () => {
            if (!client) return [];
            const user = (await client.auth.getUser()).data.user;
            if (!user) return [];

            const { data, error } = await client.from('todos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching todos:", error);
                return [];
            }
            return data.map(row => ({
                id: isNaN(Number(row.id)) ? row.id : Number(row.id),
                text: row.text,
                completed: row.completed,
                createdAt: row.created_at
            }));
        },

        syncTodos: async (todos) => {
            if (!client) return;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return;

            // Delete current
            await client.from('todos').delete().eq('user_id', user.id);
            // Insert updated list
            if (todos.length > 0) {
                const rows = todos.map(t => ({
                    id: String(t.id),
                    user_id: user.id,
                    text: t.text,
                    completed: !!t.completed,
                    created_at: t.createdAt || new Date().toISOString()
                }));
                const { error } = await client.from('todos').insert(rows);
                if (error) console.error("Error syncing todos:", error);
            }
        },

        // Focus Sessions Sync
        fetchSessions: async () => {
            if (!client) return [];
            const user = (await client.auth.getUser()).data.user;
            if (!user) return [];

            const { data, error } = await client.from('focus_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error("Error fetching focus sessions:", error);
                return [];
            }
            return data.map(row => ({
                date: row.date,
                mode: row.mode,
                durationMs: Number(row.duration_ms),
                timestamp: Number(row.timestamp)
            }));
        },

        syncSessions: async (sessions) => {
            if (!client) return;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return;

            await client.from('focus_sessions').delete().eq('user_id', user.id);
            if (sessions.length > 0) {
                const rows = sessions.map(s => ({
                    user_id: user.id,
                    date: s.date,
                    mode: s.mode,
                    duration_ms: s.durationMs,
                    timestamp: s.timestamp
                }));
                const { error } = await client.from('focus_sessions').insert(rows);
                if (error) console.error("Error syncing sessions:", error);
            }
        },

        // Focus Presets Sync
        fetchPresets: async () => {
            if (!client) return [];
            const user = (await client.auth.getUser()).data.user;
            if (!user) return [];

            const { data, error } = await client.from('focus_presets')
                .select('*')
                .eq('user_id', user.id);

            if (error) {
                console.error("Error fetching focus presets:", error);
                return [];
            }
            return data.map(row => ({
                name: row.name,
                seconds: row.seconds
            }));
        },

        syncPresets: async (presets) => {
            if (!client) return;
            const user = (await client.auth.getUser()).data.user;
            if (!user) return;

            await client.from('focus_presets').delete().eq('user_id', user.id);
            if (presets.length > 0) {
                const rows = presets.map(p => ({
                    user_id: user.id,
                    name: p.name,
                    seconds: p.seconds
                }));
                const { error } = await client.from('focus_presets').insert(rows);
                if (error) console.error("Error syncing presets:", error);
            }
        },

        // Helper to push all local storage data to Supabase
        uploadLocalStorageToOnline: async () => {
            if (!client) return;
            try {
                // Sync Todos
                const localTodos = JSON.parse(localStorage.getItem('todos') || '[]');
                await window.supabaseDb.syncTodos(localTodos);

                // Sync Sessions
                const localSessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
                await window.supabaseDb.syncSessions(localSessions);

                // Sync Presets
                const localPresets = JSON.parse(localStorage.getItem('focusPresets') || '[]');
                await window.supabaseDb.syncPresets(localPresets);

                // Sync background scene State
                const localScene = JSON.parse(localStorage.getItem('sceneState') || 'null');
                if (localScene) {
                    await window.supabaseDb.saveSceneState(localScene);
                }
            } catch (e) {
                console.error("Error uploading local storage data:", e);
            }
        },

        // Helper to clear all local storage focus data
        clearLocalFocusData: () => {
            localStorage.removeItem('todos');
            localStorage.removeItem('focusSessions');
            localStorage.removeItem('focusPresets');
            localStorage.removeItem('sceneState');
            localStorage.removeItem('bgScene');
            localStorage.removeItem('customBg');
            localStorage.removeItem('focusTimerState');
        }
    };

    // 2. Authentication Gate & Dynamic UI Injection
    document.addEventListener('DOMContentLoaded', async () => {
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1);

        // Don't run redirect gates on index.html
        if (pageName === 'index.html' || pageName === '') {
            if (isConfigured) {
                const loggedIn = await window.supabaseDb.isLoggedIn();
                if (loggedIn) {
                    window.location.href = 'dashboard.html';
                }
            }
            return;
        }

        // Gate Redirect Check
        if (isConfigured) {
            const loggedIn = await window.supabaseDb.isLoggedIn();
            const continueWithoutAccount = localStorage.getItem('auth_continue_without_account') === 'true';
            
            if (!loggedIn && !continueWithoutAccount) {
                window.location.href = 'index.html';
                return;
            }
        }

        // Inject styles & UI elements
        injectProfileStyles();
        await injectProfileWidget();
        setupMergePromptModal();
    });

    // 3. Inject CSS Styles for Profile Widget
    function injectProfileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .profile-widget {
                position: relative;
                display: inline-flex;
                flex-direction: column;
                align-items: flex-end;
                margin-bottom: 8px;
                z-index: 10000;
            }
            .profile-avatar {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            }
            .profile-avatar:hover {
                transform: scale(1.05);
                border-color: rgba(255, 255, 255, 0.45);
                background: rgba(255, 255, 255, 0.15);
            }
            .profile-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            .profile-avatar-initial {
                font-size: 15px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.85);
                text-transform: uppercase;
            }
            .profile-dropdown {
                position: absolute;
                top: 46px;
                right: 0;
                background: rgba(10, 12, 16, 0.85);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                padding: 12px;
                width: 220px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 10001;
            }
            .profile-dropdown.show {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            .profile-dropdown-email {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.95);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .profile-dropdown-mode {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.50);
                margin-top: -2px;
            }
            .profile-dropdown-btn {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.9);
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
                text-align: left;
                width: 100%;
            }
            .profile-dropdown-btn:hover {
                background: rgba(255, 255, 255, 0.16);
                border-color: rgba(255, 255, 255, 0.15);
            }
            .profile-dropdown-btn.danger {
                color: #ff5c5c;
                background: rgba(255, 92, 92, 0.06);
                border-color: rgba(255, 92, 92, 0.1);
            }
            .profile-dropdown-btn.danger:hover {
                background: rgba(255, 92, 92, 0.15);
                border-color: rgba(255, 92, 92, 0.2);
            }
            
            /* Merge Data Modal Dialog */
            .merge-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 20000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .merge-modal-overlay.show {
                opacity: 1;
            }
            .merge-modal {
                background: rgba(18, 22, 30, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 16px;
                padding: 24px;
                max-width: 440px;
                width: 90%;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                color: #fff;
                transform: scale(0.9);
                transition: transform 0.3s ease;
                text-align: center;
            }
            .merge-modal-overlay.show .merge-modal {
                transform: scale(1);
            }
            .merge-title {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 12px;
                letter-spacing: 0.02em;
            }
            .merge-desc {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
                margin-bottom: 24px;
            }
            .merge-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            .merge-btn {
                padding: 10px 20px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
            }
            .merge-btn-yes {
                background: #fff;
                color: #0a0c10;
                border: none;
            }
            .merge-btn-yes:hover {
                background: rgba(255, 255, 255, 0.9);
                transform: translateY(-1px);
            }
            .merge-btn-no {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.15);
            }
            .merge-btn-no:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    // 4. Inject Profile Widget into DOM above weather Display
    async function injectProfileWidget() {
        const topRight = document.querySelector('.top-right');
        if (!topRight) return;

        // Check auth status
        const loggedIn = await window.supabaseDb.isLoggedIn();
        const user = loggedIn ? await window.supabaseDb.getCurrentUser() : null;

        // Default letter/initial
        let initial = 'U';
        let email = 'Not Logged In';
        let modeText = 'Local Offline Mode';
        let avatarData = null;

        if (loggedIn && user) {
            email = user.email;
            modeText = 'Online Synced';
            initial = user.email.charAt(0).toUpperCase();

            // Load online profile details
            const profile = await window.supabaseDb.fetchProfile();
            if (profile && profile.avatar_data) {
                avatarData = profile.avatar_data;
            }
            
            // Apply background scene preference if available
            if (profile && profile.scene_state) {
                try {
                    const sceneState = JSON.parse(profile.scene_state);
                    const localScene = localStorage.getItem('sceneState');
                    
                    // Only apply if it is different to avoid layout loop updates
                    if (JSON.stringify(sceneState) !== localScene) {
                        localStorage.setItem('sceneState', JSON.stringify(sceneState));
                        
                        // Also write keys used by todo.html
                        if (sceneState.activeId) {
                            localStorage.setItem('bgScene', sceneState.activeId);
                            if (sceneState.activeId === 'scene-custom' && sceneState.customDataUrl) {
                                localStorage.setItem('customBg', sceneState.customDataUrl);
                            } else {
                                localStorage.removeItem('customBg');
                            }
                        }

                        // Trigger visual page update of scene background if the current page has activateScene()
                        if (typeof window.activateScene === 'function') {
                            window.activateScene(sceneState.activeId);
                        } else if (typeof window.loadSavedBackground === 'function') {
                            window.loadSavedBackground();
                        } else if (sceneState.activeId) {
                            // Manual fallback background toggle if functions not globally scoped
                            const activeScene = document.getElementById(sceneState.activeId);
                            if (activeScene) {
                                document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
                                activeScene.classList.add('active');
                            }
                        }
                    }
                } catch(err) {
                    console.error("Failed to load scene state:", err);
                }
            }
        }

        // Create widget element
        const widget = document.createElement('div');
        widget.className = 'profile-widget';
        widget.id = 'profileWidget';

        widget.innerHTML = `
            <div class="profile-avatar" id="profileAvatar" title="User Profile">
                <span class="profile-avatar-initial" id="profileAvatarInitial" style="${avatarData ? 'display:none;' : ''}">${initial}</span>
                <img id="profileAvatarImg" src="${avatarData || ''}" style="${avatarData ? '' : 'display:none;'}" />
            </div>
            <div class="profile-dropdown" id="profileDropdown">
                <div class="profile-email" id="profileEmail" title="${email}">${email}</div>
                <div class="profile-mode" id="profileMode">${modeText}</div>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 6px 0;" />
                ${loggedIn ? `
                    <button id="profileUploadBtn" class="profile-dropdown-btn">Upload Photo</button>
                    <input type="file" id="profileFileInput" accept="image/*" style="display:none;" />
                    <button id="profileActionBtn" class="profile-dropdown-btn danger">Log Out</button>
                ` : `
                    <button id="profileActionBtn" class="profile-dropdown-btn">Log In / Sign Up</button>
                `}
            </div>
        `;

        // Prepend above other components (e.g. before the info-row weather)
        if (topRight.firstChild) {
            topRight.insertBefore(widget, topRight.firstChild);
        } else {
            topRight.appendChild(widget);
        }

        // Dropdown toggle handler
        const avatar = widget.querySelector('#profileAvatar');
        const dropdown = widget.querySelector('#profileDropdown');
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        // Action Buttons Setup
        const actionBtn = widget.querySelector('#profileActionBtn');
        actionBtn.addEventListener('click', async () => {
            if (loggedIn) {
                await window.supabaseDb.logout();
            } else {
                window.location.href = 'index.html';
            }
        });

        // Profile Picture Upload Handler
        if (loggedIn) {
            const uploadBtn = widget.querySelector('#profileUploadBtn');
            const fileInput = widget.querySelector('#profileFileInput');
            const avatarImg = widget.querySelector('#profileAvatarImg');
            const avatarInitial = widget.querySelector('#profileAvatarInitial');

            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = async function() {
                        // Compress Image to 128x128 JPEG using Canvas
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 128;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

                        // Save to database
                        const success = await window.supabaseDb.saveProfilePicture(compressedBase64);
                        if (success) {
                            avatarImg.src = compressedBase64;
                            avatarImg.style.display = 'block';
                            avatarInitial.style.display = 'none';
                        } else {
                            alert("Failed to upload profile picture.");
                        }
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // 5. Build Merge Data Prompt Overlay Modal
    function setupMergePromptModal() {
        if (localStorage.getItem('auth_prompt_merge_data') !== 'true') return;

        // Check if user is logged in
        window.supabaseDb.isLoggedIn().then(loggedIn => {
            if (!loggedIn) {
                localStorage.removeItem('auth_prompt_merge_data');
                return;
            }

            // Check if there is actual local data
            const localTodosCount = JSON.parse(localStorage.getItem('todos') || '[]').length;
            const localSessionsCount = JSON.parse(localStorage.getItem('focusSessions') || '[]').length;
            const localPresetsCount = JSON.parse(localStorage.getItem('focusPresets') || '[]').length;

            if (localTodosCount === 0 && localSessionsCount === 0 && localPresetsCount === 0) {
                // No local data, no need to ask
                localStorage.removeItem('auth_prompt_merge_data');
                return;
            }

            // Create Modal
            const overlay = document.createElement('div');
            overlay.className = 'merge-modal-overlay';
            overlay.innerHTML = `
                <div class="merge-modal">
                    <div class="merge-title">Sync Local Data?</div>
                    <div class="merge-desc">
                        We found existing local sessions and tasks on this device. Would you like to upload and sync them to your new online account? 
                        <br/><br/>
                        If you choose <strong>"No"</strong>, your online account starts fresh and your local offline data will be discarded.
                    </div>
                    <div class="merge-actions">
                        <button class="merge-btn merge-btn-yes" id="mergeBtnYes">Yes, Sync and Save</button>
                        <button class="merge-btn merge-btn-no" id="mergeBtnNo">No, Start Fresh</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            
            // Triggers transition
            setTimeout(() => overlay.classList.add('show'), 50);

            const btnYes = overlay.querySelector('#mergeBtnYes');
            const btnNo = overlay.querySelector('#mergeBtnNo');

            btnYes.addEventListener('click', async () => {
                btnYes.disabled = true;
                btnYes.textContent = 'Syncing...';
                await window.supabaseDb.uploadLocalStorageToOnline();
                localStorage.removeItem('auth_prompt_merge_data');
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.remove();
                    window.location.reload();
                }, 300);
            });

            btnNo.addEventListener('click', () => {
                window.supabaseDb.clearLocalFocusData();
                localStorage.removeItem('auth_prompt_merge_data');
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.remove();
                    window.location.reload();
                }, 300);
            });
        });
    }

})();

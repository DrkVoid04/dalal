// Global state
let currentUser = null;
let messages = [];
let currentMessageId = null;
let currentEmbedCount = 0;
let currentButtonCount = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    populateServerSwitcher();
    updateDashboardUserDisplay();
});

async function updateDashboardUserDisplay() {
    // In test mode, use test user data
    if (window.location.hostname.includes('staticblitz') || window.location.hostname.includes('localhost')) {
        const avatarElement = document.getElementById('user-avatar-dashboard');
        const usernameElement = document.getElementById('user-username-dashboard');
        if (avatarElement) avatarElement.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (usernameElement) usernameElement.textContent = 'Test User';
        return;
    }
    
    try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
            const { user } = await res.json();
            document.getElementById('user-avatar-dashboard').src = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
            document.getElementById('user-username-dashboard').textContent = user.username;
        }
    } catch (error) {
        console.error('Error updating user display:', error);
    }
}

async function populateServerSwitcher() {
    // In test mode, use test guilds
    if (window.location.hostname.includes('staticblitz') || window.location.hostname.includes('localhost')) {
        const switcherBtn = document.getElementById('server-switcher-btn');
        const dropdown = document.getElementById('server-switcher-dropdown');
        
        if (switcherBtn) {
            switcherBtn.innerHTML = `
                <div class="server-icon-initial">T</div>
                <span>Test Server</span>
                <span class="chevron">▼</span>
            `;
        }
        
        if (dropdown) {
            dropdown.innerHTML = `
                <div class="dropdown-header">Test Servers</div>
                <a href="/dashboard?guild=123456789" class="dropdown-item">
                    <div class="server-icon-initial">T</div>
                    <span>Test Server</span>
                </a>
                <a href="/dashboard?guild=987654321" class="dropdown-item">
                    <div class="server-icon-initial">D</div>
                    <span>Demo Community</span>
                </a>
            `;
        }
        
        if (switcherBtn) {
            switcherBtn.addEventListener('click', () => {
                if (dropdown) dropdown.classList.toggle('show');
            });
        }
        return;
    }
    
    try {
        const params = new URLSearchParams(window.location.search);
        const currentGuildId = params.get('guild');

        const res = await fetch('/api/guilds/mutual');
        const guilds = await res.json();

        const currentGuild = guilds.find(g => g.id === currentGuildId);
        const otherGuilds = guilds.filter(g => g.id !== currentGuildId);

        const switcherBtn = document.getElementById('server-switcher-btn');
        const dropdown = document.getElementById('server-switcher-dropdown');

        if (currentGuild) {
            switcherBtn.innerHTML = `
                ${currentGuild.icon ? `<img src="https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png" />` : `<div class="server-icon-initial">${currentGuild.name.charAt(0)}</div>`}
                <span>${currentGuild.name}</span>
                <span class="chevron">▼</span>
            `;
        }

        if (otherGuilds.length > 0) {
            dropdown.innerHTML = `
                <div class="dropdown-header">Jump to</div>
                ${otherGuilds.map(g => `
                    <a href="/dashboard?guild=${g.id}" class="dropdown-item">
                        ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" />` : `<div class="server-icon-initial">${g.name.charAt(0)}</div>`}
                        <span>${g.name}</span>
                    </a>
                `).join('')}
            `;
        } else {
            dropdown.innerHTML = `<div class="dropdown-header">No other servers</div>`;
        }

        switcherBtn.addEventListener('click', () => {
            dropdown.classList.toggle('show');
        });
    } catch (error) {
        console.error('Error populating server switcher:', error);
    }
}

async function initializeApp() {
    // In test mode, skip authentication
    if (window.location.hostname.includes('staticblitz') || window.location.hostname.includes('localhost')) {
        currentUser = { 
            username: 'Test User', 
            discordId: 'test123', 
            avatar: '0',
            _id: 'test-user-id'
        };
        hideAuthModal();
        loadUserMessages();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            hideAuthModal();
            loadUserMessages();
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showAuthModal();
    }
}

function setupEventListeners() {
    // Navigation
    setupNavigation();
    
    // Authentication
    setupAuthentication();
    
    // Load sections dynamically
    loadSectionContent();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
        });
    });
}

function setupAuthentication() {
    const discordLoginBtn = document.getElementById('discord-login-btn');

    if (discordLoginBtn) {
        discordLoginBtn.addEventListener('click', () => {
            window.location.href = '/api/auth/discord';
        });
    }
}

function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
}

function hideAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

async function loadSectionContent() {
    const dynamicContent = document.getElementById('dynamic-content');
    
    try {
        // Load embed editor
        const embedEditorResponse = await fetch('/dashboard/embed-editor.html');
        const embedEditorHtml = await embedEditorResponse.text();
        
        // Load community
        const communityResponse = await fetch('/dashboard/community.html');
        const communityHtml = await communityResponse.text();
        
        // Load other sections
        const otherSectionsResponse = await fetch('/dashboard/other-sections.html');
        const otherSectionsHtml = await otherSectionsResponse.text();
        
        dynamicContent.innerHTML = embedEditorHtml + communityHtml + otherSectionsHtml;
        
        // Setup embed editor functionality
        setupEmbedEditor();
        setupCommunity();
        
    } catch (error) {
        console.error('Error loading section content:', error);
    }
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        if (sectionName === 'embed-editor') {
            loadEmbedEditorSection();
        } else if (sectionName === 'community') {
            loadCommunityMessages();
        }
    }
}

function setupEmbedEditor() {
    const createNewBtn = document.getElementById('create-new-message');
    const createFirstBtn = document.getElementById('create-first-message');
    const backToListBtn = document.getElementById('back-to-list');
    const saveMessageBtn = document.getElementById('save-message');
    const addEmbedBtn = document.getElementById('add-embed-btn');
    const messageContentInput = document.getElementById('message-content');
    const addButtonBtn = document.getElementById('add-button-btn');
    const buttonTypeSelect = document.getElementById('button-type');

    [createNewBtn, createFirstBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => showMessageBuilder());
    });

    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => showMessageList());
    }

    if (saveMessageBtn) {
        saveMessageBtn.addEventListener('click', () => saveMessage());
    }

    if (addEmbedBtn) {
        addEmbedBtn.addEventListener('click', () => addEmbed());
    }

    if (messageContentInput) {
        messageContentInput.addEventListener('input', updatePreview);
    }

    if (addButtonBtn) {
        addButtonBtn.addEventListener('click', () => addButton());
    }

    if (buttonTypeSelect) {
        buttonTypeSelect.addEventListener('change', () => {
            const urlInput = document.getElementById('button-url');
            if (buttonTypeSelect.value === 'link') {
                urlInput.style.display = 'block';
            } else {
                urlInput.style.display = 'none';
            }
        });
    }

    // Setup view toggle
    setupViewToggle();
}

function setupViewToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const previewView = document.getElementById('preview-view');
    const codeView = document.getElementById('code-view');
    const copyCodeBtn = document.getElementById('copy-code');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.getAttribute('data-view');
            if (view === 'preview') {
                previewView.style.display = 'flex';
                codeView.style.display = 'none';
            } else {
                previewView.style.display = 'none';
                codeView.style.display = 'block';
                updateCodeView();
            }
        });
    });

    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const codeContent = document.getElementById('code-content');
            codeContent.select();
            document.execCommand('copy');
            showNotification('Code copied to clipboard!', 'success');
        });
    }
}

function loadEmbedEditorSection() {
    if (currentUser) {
        loadUserMessages();
    }
    showMessageList();
}

async function loadUserMessages() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/messages`);
        
        if (response.ok) {
            messages = await response.json();
            updateMessagesList();
            updateDashboardStats();
        } else {
            console.error('Failed to load messages');
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function updateMessagesList() {
    const messageCardsContainer = document.getElementById('message-cards-container');
    const noMessagesMessage = document.getElementById('no-messages-message');
    
    if (!messageCardsContainer || !noMessagesMessage) return;
    
    messageCardsContainer.innerHTML = '';

    if (!currentUser) {
        messageCardsContainer.style.display = 'none';
        noMessagesMessage.style.display = 'block';
        noMessagesMessage.querySelector('h3').textContent = "Please sign in to see your messages.";
        noMessagesMessage.querySelector('p').textContent = "Once you sign in, your created messages will appear here.";
        const button = noMessagesMessage.querySelector('button');
        if (button) button.style.display = 'none';
        return;
    }

    if (messages.length === 0) {
        messageCardsContainer.style.display = 'none';
        noMessagesMessage.style.display = 'block';
    } else {
        messageCardsContainer.style.display = 'grid';
        noMessagesMessage.style.display = 'none';
        
        messageCardsContainer.innerHTML = messages.map(message => createMessageCard(message)).join('');
        
        // Add event listeners for message cards
        setupMessageCardListeners();
    }
}

function createMessageCard(message) {
    const createdDate = new Date(message.createdAt).toLocaleDateString();
    const content = message.content || 'No content';
    const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
    const embedCount = message.embeds ? message.embeds.length : 0;
    const isPublic = message.is_public || false;

    return `
        <div class="message-card-item" data-message-id="${message._id}">
            <div class="message-card-header">
                <div class="message-card-info">
                    <h3 class="message-card-title">${message.title || 'Untitled Message'}</h3>
                    <p class="message-card-description">${truncatedContent}</p>
                    <div class="message-card-stats">
                        <span class="embed-count">${embedCount} embed${embedCount !== 1 ? 's' : ''}</span>
                        ${isPublic ? '<span class="public-badge">Public</span>' : ''}
                    </div>
                </div>
                <div class="message-menu">
                    <button class="message-menu-btn">⋮</button>
                    <div class="message-menu-dropdown">
                        <button class="message-menu-item" data-action="copy-id">Copy ID</button>
                        <button class="message-menu-item" data-action="duplicate">Duplicate</button>
                        <button class="message-menu-item" data-action="delete">Delete</button>
                    </div>
                </div>
            </div>
            <div class="message-card-meta">
                <span class="message-card-id">${message.messageId}</span>
                <span class="message-card-date">${createdDate}</span>
            </div>
        </div>
    `;
}

function setupMessageCardListeners() {
    const messageCards = document.querySelectorAll('.message-card-item');
    const menuBtns = document.querySelectorAll('.message-menu-btn');
    const menuItems = document.querySelectorAll('.message-menu-item');

    messageCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.message-menu')) {
                const messageId = this.getAttribute('data-message-id');
                editMessage(messageId);
            }
        });
    });

    menuBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            closeAllDropdowns();
            dropdown.classList.toggle('show');
        });
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            const messageId = this.closest('.message-card-item').getAttribute('data-message-id');
            handleMessageAction(action, messageId);
            closeAllDropdowns();
        });
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.message-menu-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

function handleMessageAction(action, messageId) {
    const message = messages.find(m => m._id === messageId);
    if (!message) return;
    
    switch (action) {
        case 'copy-id':
            navigator.clipboard.writeText(message.messageId).then(() => {
                showNotification('Message ID copied to clipboard!', 'success');
            });
            break;
        case 'duplicate':
            duplicateMessage(messageId);
            break;
        case 'delete':
            if (confirm('Are you sure you want to delete this message?')) {
                deleteMessage(messageId);
            }
            break;
    }
}

async function deleteMessage(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
        
        if (response.ok) {
            messages = messages.filter(m => m._id !== messageId);
            updateMessagesList();
            updateDashboardStats();
            showNotification('Message deleted successfully!', 'success');
        } else {
            showNotification('Failed to delete message', 'error');
        }
    } catch (error) {
        showNotification('Error deleting message', 'error');
    }
}

function showMessageList() {
    const listView = document.getElementById('message-list-view');
    const builderView = document.getElementById('message-builder-view');
    
    if (listView) listView.style.display = 'block';
    if (builderView) builderView.style.display = 'none';
    currentMessageId = null;
}

function showMessageBuilder(messageId = null) {
    const listView = document.getElementById('message-list-view');
    const builderView = document.getElementById('message-builder-view');
    
    if (listView) listView.style.display = 'none';
    if (builderView) builderView.style.display = 'block';
    
    currentMessageId = messageId;
    currentEmbedCount = 0;
    currentButtonCount = 0;
    
    const builderTitle = document.getElementById('builder-title');
    if (messageId) {
        if (builderTitle) builderTitle.textContent = 'Edit Message';
        loadMessageForEditing(messageId);
    } else {
        if (builderTitle) builderTitle.textContent = 'Create New Message';
        clearMessageForm();
        updatePreview();
    }
}

function editMessage(messageId) {
    showMessageBuilder(messageId);
}

async function loadMessageForEditing(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}`);
        
        if (response.ok) {
            const message = await response.json();
            populateMessageForm(message);
            updatePreview();
        } else {
            showNotification('Failed to load message', 'error');
        }
    } catch (error) {
        showNotification('Error loading message', 'error');
    }
}

function populateMessageForm(message) {
    const messageContent = document.getElementById('message-content');
    if (messageContent) {
        messageContent.value = message.content || '';
    }
    
    // Clear existing embeds and buttons
    const embedsContainer = document.getElementById('embeds-container');
    const buttonsContainer = document.getElementById('buttons-container');
    
    if (embedsContainer) embedsContainer.innerHTML = '';
    if (buttonsContainer) buttonsContainer.innerHTML = '';
    
    currentEmbedCount = 0;
    currentButtonCount = 0;
    
    // Add embeds
    if (message.embeds && message.embeds.length > 0) {
        message.embeds.forEach(embed => {
            addEmbed(embed);
        });
    }
    
    // Add buttons
    if (message.components && message.components.length > 0) {
        message.components.forEach(component => {
            if (component.components) {
                component.components.forEach(button => {
                    addButton(button);
                });
            }
        });
    }
}

function clearMessageForm() {
    const messageContent = document.getElementById('message-content');
    const embedsContainer = document.getElementById('embeds-container');
    const buttonsContainer = document.getElementById('buttons-container');
    
    if (messageContent) messageContent.value = '';
    if (embedsContainer) embedsContainer.innerHTML = '';
    if (buttonsContainer) buttonsContainer.innerHTML = '';
    
    currentEmbedCount = 0;
    currentButtonCount = 0;
}

function addEmbed(embedData = null) {
    currentEmbedCount++;
    const embedId = `embed-${currentEmbedCount}`;
    
    const embedHtml = `
        <div class="embed-placeholder" data-embed-id="${embedId}">
            <div class="embed-header">
                <h4>Embed ${currentEmbedCount}</h4>
                <button class="btn btn-small btn-secondary remove-embed" onclick="removeEmbed('${embedId}')">Remove</button>
            </div>
            <div class="embed-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" class="embed-title" placeholder="Embed title" maxlength="256" value="${embedData?.title || ''}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="embed-description" placeholder="Embed description" maxlength="4096">${embedData?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" class="embed-color" value="${embedData?.color ? '#' + embedData.color.toString(16).padStart(6, '0') : '#3b82f6'}">
                </div>
                <div class="form-group">
                    <label>Thumbnail URL</label>
                    <input type="url" class="embed-thumbnail" placeholder="https://example.com/thumbnail.jpg" value="${embedData?.thumbnail?.url || ''}">
                </div>
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="url" class="embed-image" placeholder="https://example.com/image.jpg" value="${embedData?.image?.url || ''}">
                </div>
                <div class="form-group">
                    <label>Footer Text</label>
                    <input type="text" class="embed-footer-text" placeholder="Footer text" value="${embedData?.footer?.text || ''}">
                </div>
            </div>
            <div class="embed-thumbnail-preview" id="thumbnail-preview-${embedId}">
                <img src="" alt="Thumbnail">
            </div>
        </div>
    `;
    
    const embedsContainer = document.getElementById('embeds-container');
    if (embedsContainer) {
        embedsContainer.insertAdjacentHTML('beforeend', embedHtml);
        
        // Add event listeners for real-time preview
        const embedElement = document.querySelector(`[data-embed-id="${embedId}"]`);
        if (embedElement) {
            embedElement.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('input', updatePreview);
                
                // Special handling for thumbnail URL
                if (input.classList.contains('embed-thumbnail')) {
                    input.addEventListener('input', () => updateThumbnailPreview(embedId));
                }
            });
        }
        
        // Show add button section if we have embeds
        const addButtonSection = document.querySelector('.add-button-section');
        if (addButtonSection) {
            addButtonSection.style.display = 'block';
        }
        
        updatePreview();
        updateThumbnailPreview(embedId);
    }
}

function removeEmbed(embedId) {
    const embedElement = document.querySelector(`[data-embed-id="${embedId}"]`);
    if (embedElement) {
        embedElement.remove();
        
        // Hide add button section if no embeds
        const remainingEmbeds = document.querySelectorAll('.embed-placeholder');
        if (remainingEmbeds.length === 0) {
            const addButtonSection = document.querySelector('.add-button-section');
            if (addButtonSection) {
                addButtonSection.style.display = 'none';
            }
        }
        
        updatePreview();
    }
}

function updateThumbnailPreview(embedId) {
    const thumbnailInput = document.querySelector(`[data-embed-id="${embedId}"] .embed-thumbnail`);
    const thumbnailPreview = document.getElementById(`thumbnail-preview-${embedId}`);
    
    if (thumbnailInput && thumbnailPreview) {
        const url = thumbnailInput.value;
        if (url) {
            thumbnailPreview.querySelector('img').src = url;
            thumbnailPreview.classList.add('show');
        } else {
            thumbnailPreview.classList.remove('show');
        }
    }
}

function addButton(buttonData = null) {
    currentButtonCount++;
    const buttonId = `button-${currentButtonCount}`;
    
    const buttonType = buttonData?.style || document.getElementById('button-type')?.value || 'primary';
    const buttonLabel = buttonData?.label || document.getElementById('button-label')?.value || 'Button';
    const buttonUrl = buttonData?.url || document.getElementById('button-url')?.value || '';
    
    const buttonHtml = `
        <div class="message-button ${buttonType}" data-button-id="${buttonId}">
            ${buttonLabel}
            <button class="remove-btn" onclick="removeButton('${buttonId}')">×</button>
        </div>
    `;
    
    const buttonsContainer = document.getElementById('buttons-container');
    if (buttonsContainer) {
        buttonsContainer.insertAdjacentHTML('beforeend', buttonHtml);
        
        // Clear input fields
        const labelInput = document.getElementById('button-label');
        const urlInput = document.getElementById('button-url');
        if (labelInput) labelInput.value = '';
        if (urlInput) urlInput.value = '';
        
        updatePreview();
    }
}

function removeButton(buttonId) {
    const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
    if (buttonElement) {
        buttonElement.remove();
        updatePreview();
    }
}

function updatePreview() {
    const messageContent = document.getElementById('message-content')?.value || '';
    const previewContent = document.getElementById('preview-content');
    const previewEmbeds = document.getElementById('preview-embeds');
    const previewButtons = document.getElementById('preview-buttons');
    
    // Update message content
    if (previewContent) {
        previewContent.textContent = messageContent || 'Type your message here...';
    }
    
    // Update embeds
    if (previewEmbeds) {
        previewEmbeds.innerHTML = '';
        
        const embedElements = document.querySelectorAll('.embed-placeholder');
        embedElements.forEach(embedElement => {
            const embedData = getEmbedData(embedElement);
            if (embedData.title || embedData.description) {
                previewEmbeds.appendChild(createEmbedPreview(embedData));
            }
        });
    }
    
    // Update buttons
    if (previewButtons) {
        const buttonsContainer = document.getElementById('buttons-container');
        if (buttonsContainer && buttonsContainer.children.length > 0) {
            previewButtons.innerHTML = buttonsContainer.innerHTML;
            // Remove remove buttons from preview
            previewButtons.querySelectorAll('.remove-btn').forEach(btn => btn.remove());
        } else {
            previewButtons.innerHTML = '';
        }
    }
}

function getEmbedData(embedElement) {
    return {
        title: embedElement.querySelector('.embed-title')?.value || '',
        description: embedElement.querySelector('.embed-description')?.value || '',
        color: parseInt(embedElement.querySelector('.embed-color')?.value.replace('#', ''), 16) || 0,
        thumbnail: {
            url: embedElement.querySelector('.embed-thumbnail')?.value || ''
        },
        image: {
            url: embedElement.querySelector('.embed-image')?.value || ''
        },
        footer: {
            text: embedElement.querySelector('.embed-footer-text')?.value || ''
        }
    };
}

function createEmbedPreview(embedData) {
    const embedDiv = document.createElement('div');
    embedDiv.className = 'discord-embed';
    embedDiv.style.borderLeftColor = `#${embedData.color.toString(16).padStart(6, '0')}`;
    
    let embedHtml = '<div class="embed-content">';
    
    if (embedData.title) {
        embedHtml += `<div class="embed-title">${embedData.title}</div>`;
    }
    
    if (embedData.description) {
        embedHtml += `<div class="embed-description">${embedData.description}</div>`;
    }
    
    if (embedData.thumbnail.url) {
        embedHtml += `<div class="embed-thumbnail"><img src="${embedData.thumbnail.url}" alt="Thumbnail"></div>`;
    }
    
    if (embedData.image.url) {
        embedHtml += `<div class="embed-image"><img src="${embedData.image.url}" alt="Image"></div>`;
    }
    
    if (embedData.footer.text) {
        embedHtml += `<div class="embed-footer"><span>${embedData.footer.text}</span></div>`;
    }
    
    embedHtml += '</div>';
    embedDiv.innerHTML = embedHtml;
    
    return embedDiv;
}

function updateCodeView() {
    const messageContent = document.getElementById('message-content')?.value || '';
    const embedElements = document.querySelectorAll('.embed-placeholder');
    const buttonElements = document.querySelectorAll('#buttons-container .message-button');
    
    const embeds = [];
    embedElements.forEach(embedElement => {
        const embedData = getEmbedData(embedElement);
        
        // Clean up empty fields
        const cleanEmbed = {};
        if (embedData.title) cleanEmbed.title = embedData.title;
        if (embedData.description) cleanEmbed.description = embedData.description;
        if (embedData.color) cleanEmbed.color = embedData.color;
        if (embedData.thumbnail.url) cleanEmbed.thumbnail = { url: embedData.thumbnail.url };
        if (embedData.image.url) cleanEmbed.image = { url: embedData.image.url };
        if (embedData.footer.text) cleanEmbed.footer = { text: embedData.footer.text };
        
        if (Object.keys(cleanEmbed).length > 0) {
            embeds.push(cleanEmbed);
        }
    });
    
    const components = [];
    if (buttonElements.length > 0) {
        const buttons = [];
        buttonElements.forEach(buttonElement => {
            const buttonType = Array.from(buttonElement.classList).find(cls => 
                ['primary', 'secondary', 'success', 'danger', 'link'].includes(cls)
            ) || 'primary';
            
            const button = {
                type: 2,
                style: buttonType === 'primary' ? 1 : buttonType === 'secondary' ? 2 : 
                       buttonType === 'success' ? 3 : buttonType === 'danger' ? 4 : 5,
                label: buttonElement.textContent.replace('×', '').trim()
            };
            
            if (buttonType === 'link') {
                button.url = 'https://example.com';
            }
            
            buttons.push(button);
        });
        
        if (buttons.length > 0) {
            components.push({
                type: 1,
                components: buttons
            });
        }
    }
    
    const messageData = {};
    if (messageContent) messageData.content = messageContent;
    if (embeds.length > 0) messageData.embeds = embeds;
    if (components.length > 0) messageData.components = components;
    
    const codeContent = document.getElementById('code-content');
    if (codeContent) {
        codeContent.value = JSON.stringify(messageData, null, 2);
    }
}

async function saveMessage() {
    const messageContent = document.getElementById('message-content')?.value || '';
    const embedElements = document.querySelectorAll('.embed-placeholder');
    const buttonElements = document.querySelectorAll('#buttons-container .message-button');
    
    const embeds = [];
    embedElements.forEach(embedElement => {
        const embedData = getEmbedData(embedElement);
        if (embedData.title || embedData.description) {
            embeds.push(embedData);
        }
    });
    
    const components = [];
    if (buttonElements.length > 0) {
        const buttons = [];
        buttonElements.forEach(buttonElement => {
            const buttonType = Array.from(buttonElement.classList).find(cls => 
                ['primary', 'secondary', 'success', 'danger', 'link'].includes(cls)
            ) || 'primary';
            
            buttons.push({
                type: 2,
                style: buttonType === 'primary' ? 1 : buttonType === 'secondary' ? 2 : 
                       buttonType === 'success' ? 3 : buttonType === 'danger' ? 4 : 5,
                label: buttonElement.textContent.replace('×', '').trim()
            });
        });
        
        if (buttons.length > 0) {
            components.push({
                type: 1,
                components: buttons
            });
        }
    }
    
    const messageData = {
        content: messageContent,
        embeds: embeds,
        components: components,
        is_public: false
    };

    try {
        const url = currentMessageId ? `/api/messages/${currentMessageId}` : '/api/messages';
        const method = currentMessageId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData),
        });
        
        if (response.ok) {
            showNotification(currentMessageId ? 'Message updated!' : 'Message created!', 'success');
            loadUserMessages();
            showMessageList();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to save message', 'error');
        }
    } catch (error) {
        showNotification('Error saving message', 'error');
    }
}

// Community functionality
function setupCommunity() {
    const searchBtn = document.getElementById('search-community');
    const searchInput = document.getElementById('community-search');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchCommunityMessages);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCommunityMessages();
            }
        });
    }
}

async function loadCommunityMessages() {
    const container = document.getElementById('community-messages');
    const loading = document.getElementById('community-loading');
    
    if (loading) loading.style.display = 'block';
    if (container) container.innerHTML = '';
    
    try {
        const response = await fetch('/api/messages/public');
        if (response.ok) {
            const messages = await response.json();
            displayCommunityMessages(messages);
        } else {
            if (container) container.innerHTML = '<p>Failed to load community messages</p>';
        }
    } catch (error) {
        if (container) container.innerHTML = '<p>Error loading community messages</p>';
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

async function searchCommunityMessages() {
    const search = document.getElementById('community-search')?.value || '';
    const category = document.getElementById('community-category')?.value || '';
    const tagsSelect = document.getElementById('community-tags');
    const tags = tagsSelect ? Array.from(tagsSelect.selectedOptions).map(option => option.value) : [];
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (tags.length > 0) params.append('tags', tags.join(','));
    
    const container = document.getElementById('community-messages');
    const loading = document.getElementById('community-loading');
    
    if (loading) loading.style.display = 'block';
    if (container) container.innerHTML = '';
    
    try {
        const response = await fetch(`/api/messages/public/search?${params}`);
        if (response.ok) {
            const messages = await response.json();
            displayCommunityMessages(messages);
        } else {
            if (container) container.innerHTML = '<p>No messages found</p>';
        }
    } catch (error) {
        if (container) container.innerHTML = '<p>Error searching messages</p>';
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function displayCommunityMessages(messages) {
    const container = document.getElementById('community-messages');
    
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = '<p>No public messages found</p>';
        return;
    }
    
    container.innerHTML = messages.map(message => `
        <div class="community-message-card">
            <div class="community-message-header">
                <h3>${message.title || 'Untitled Message'}</h3>
                <div class="community-message-meta">
                    <span class="category-badge">${message.category || 'Other'}</span>
                    <span class="author">by ${message.author?.username || 'Anonymous'}</span>
                </div>
            </div>
            <div class="community-message-content">
                <p>${message.content ? message.content.substring(0, 150) + '...' : 'No content'}</p>
                ${message.embeds && message.embeds.length > 0 ? `<span class="embed-count">${message.embeds.length} embed${message.embeds.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
            <div class="community-message-tags">
                ${message.tags ? message.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
            <div class="community-message-actions">
                <button class="btn btn-secondary" onclick="useMessage('${message._id}')">Use Message</button>
                <button class="btn btn-outline" onclick="previewMessage('${message._id}')">Preview</button>
            </div>
        </div>
    `).join('');
}

async function useMessage(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}`);
        if (response.ok) {
            const message = await response.json();
            
            // Switch to embed editor
            document.querySelector('[data-section="embed-editor"]')?.click();
            showMessageBuilder();
            
            // Populate form with message data
            populateMessageForm(message);
            
            showNotification('Message loaded for editing!', 'success');
        } else {
            showNotification('Failed to load message', 'error');
        }
    } catch (error) {
        showNotification('Error loading message', 'error');
    }
}

function previewMessage(messageId) {
    showNotification('Preview functionality coming soon!', 'info');
}

function updateDashboardStats() {
    const totalMessagesElement = document.getElementById('total-messages');
    const publicMessagesElement = document.getElementById('public-messages');
    
    if (totalMessagesElement) {
        totalMessagesElement.textContent = messages.length;
    }
    
    if (publicMessagesElement) {
        const publicCount = messages.filter(m => m.is_public).length;
        publicMessagesElement.textContent = publicCount;
    }
}

// Utility functions
function duplicateMessage(messageId) {
    console.log("Duplicate message:", messageId);
}

function addField(type) {
    console.log("Add field:", type);
}

function createRank() {
    console.log("Create rank");
}

// Notification system
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container') || createNotifContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, 3000);
}

function createNotifContainer() {
    let container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
        .notification {
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transform: translateX(120%);
            transition: transform 0.3s ease-in-out;
        }
        .notification.show {
            transform: translateX(0);
        }
        .notification.success { background: linear-gradient(45deg, #10b981, #059669); }
        .notification.error { background: linear-gradient(45deg, #ef4444, #dc2626); }
        .notification.info { background: linear-gradient(45deg, #3b82f6, #2563eb); }
    `;
    document.head.appendChild(style);

    return container;
}

// Global functions for onclick handlers
window.removeEmbed = removeEmbed;
window.removeButton = removeButton;
window.useMessage = useMessage;
window.previewMessage = previewMessage;
window.addField = addField;
window.createRank = createRank;
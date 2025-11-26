document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    let uploadedFileId = null; // To store the ID of the uploaded file

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        await uploadFile(file);
    });

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user', 'abc-123'); // Replace with a dynamic user identifier if needed

        appendMessage('user', `Uploading file: ${file.name}`);

        try {
            const response = await fetch('https://nezha-qa-api.cn-pgcloud.com/v1/files/upload', {
                method: 'POST',
                headers: {
                    // IMPORTANT: Replace with your actual Bearer token
                    'Authorization': 'Bearer app-kv9ZEYF5ojdOKbyjBOEwRp6l',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // Assuming the API returns an object with an 'id' for the uploaded file
            uploadedFileId = result.id; 
            appendMessage('bot', `File uploaded successfully. File ID: ${uploadedFileId}`);
            console.log('File upload response:', result);

        } catch (error) {
            console.error('Error uploading file:', error);
            appendMessage('bot', 'File upload failed. Please check the console for details.');
        }
    }

    function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

        appendMessage('user', userMessage);
        userInput.value = '';

        // Call the API and handle the streaming response
        fetchBotResponse(userMessage);
    }

    async function fetchBotResponse(userMessage) {
        const botMessageElement = appendMessage('bot', '');
        const messageContent = botMessageElement.querySelector('.message');
        
        // Add thinking animation
        messageContent.innerHTML = '<div class="thinking-animation"><span>.</span><span>.</span><span>.</span></div>';

        const requestBody = {
            "inputs": {},
            "query": userMessage,
            "response_mode": "streaming",
            "conversation_id": "", // You might want to manage this for conversation history
            "user": "abc-123", // You can replace this with a unique user identifier
            "files": []
        };

        if (uploadedFileId) {
            requestBody.files.push({
                "type": "image", // Assuming image, adjust if other types are needed
                "transfer_method": "local_file", // This should be 'local_file' or similar based on Dify docs for uploaded files
                "upload_file_id": uploadedFileId
            });
            uploadedFileId = null; // Reset after sending
        }

        try {
            const response = await fetch('https://nezha-qa-api.cn-pgcloud.com/v1/chat-messages', {
                method: 'POST',
                headers: {
                    // IMPORTANT: Replace with your actual Bearer token
                    'Authorization': 'Bearer app-kv9ZEYF5ojdOKbyjBOEwRp6l',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            messageContent.innerHTML = ''; // Clear thinking animation

            let typingQueue = Promise.resolve();

            const processChunk = (chunk) => {
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const jsonData = JSON.parse(line.substring(5));
                            if (jsonData.event === 'message') {
                                typingQueue = typingQueue.then(() => typeChunk(jsonData.answer, messageContent));
                            }
                        } catch (e) {
                            // Ignore parsing errors
                        }
                    }
                }
            };

            const typeChunk = (text, element) => {
                return new Promise(resolve => {
                    let i = 0;
                    function type() {
                        if (i < text.length) {
                            element.textContent += text.charAt(i);
                            i++;
                            chatBox.scrollTop = chatBox.scrollHeight;
                            setTimeout(type, 30);
                        } else {
                            resolve();
                        }
                    }
                    type();
                });
            };

            const read = () => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        return;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    processChunk(chunk);
                    read();
                });
            };

            read();

        } catch (error) {
            console.error('Error fetching bot response:', error);
            messageContent.textContent = 'Sorry, something went wrong. Please check the console for details.';
        }
    }

    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);

        const messageContent = document.createElement('div');
        messageContent.classList.add('message');
        messageContent.textContent = message;

        messageElement.appendChild(messageContent);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }
});

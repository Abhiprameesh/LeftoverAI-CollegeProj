import { createContext, useState, useEffect } from "react";
import run from "../config/gemini";
import imageInput from "../config/image";

export const Context = createContext();

const ContextProvider = (props) => {
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [prevPrompts, setPrevPrompts] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState("");
    
    // Chat history management
    const [currentChatId, setCurrentChatId] = useState(Date.now().toString());
    const [chatHistory, setChatHistory] = useState([]);
    const [currentChatData, setCurrentChatData] = useState([]);
    
    // Load chat history from localStorage on initial load
    useEffect(() => {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            setChatHistory(JSON.parse(savedHistory));
        }
    }, []);
    
    // Save chat history to localStorage whenever it changes
    useEffect(() => {
        if (chatHistory.length > 0) {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }
    }, []);

    // Auto-save current chat whenever it changes
    useEffect(() => {
        if (currentChatData.length > 0) {
            autoSaveCurrentChat();
        }
    }, [currentChatData]);

    const delayPara = (index, nextWord) => {
        setTimeout(() => {
            setResultData((prev) => prev + nextWord);
        }, 75 * index);
    };

    const newChat = () => {
        // Save current chat before creating a new one
        saveCurrentChat(true); // true means this is a new chat creation
        
        // Start a new chat
        setCurrentChatId(Date.now().toString());
        setCurrentChatData([]);
        setLoading(false);
        setShowResult(false);
        setInput("");
        setRecentPrompt("");
    };
    
    // Auto-save current chat without creating a new entry
    const autoSaveCurrentChat = () => {
        if (currentChatData.length > 0) {
            // Find a meaningful title for the chat - use the first user message
            const firstUserMessage = currentChatData.find(msg => msg.role === 'user');
            const chatTitle = firstUserMessage?.parts[0]?.text || "New Chat";
            
            // Check if this chat already exists in history
            const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
            
            if (existingChatIndex !== -1) {
                // Update existing chat
                const updatedHistory = [...chatHistory];
                updatedHistory[existingChatIndex] = {
                    id: currentChatId,
                    title: chatTitle,
                    data: currentChatData,
                    lastUpdated: Date.now()
                };
                setChatHistory(updatedHistory);
            } else {
                // Add new chat to history
                setChatHistory(prev => [
                    ...prev,
                    {
                        id: currentChatId,
                        title: chatTitle,
                        data: currentChatData,
                        lastUpdated: Date.now()
                    }
                ]);
            }
        }
    };
    
    // Save current chat and optionally mark it as completed
    const saveCurrentChat = (isNewChat = false) => {
        if (currentChatData.length > 0) {
            // Find a meaningful title for the chat
            const firstUserMessage = currentChatData.find(msg => msg.role === 'user');
            const chatTitle = firstUserMessage?.parts[0]?.text || "New Chat";
            
            // Check if this chat already exists in history
            const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
            
            if (existingChatIndex !== -1) {
                // Update existing chat
                const updatedHistory = [...chatHistory];
                updatedHistory[existingChatIndex] = {
                    id: currentChatId,
                    title: chatTitle,
                    data: currentChatData,
                    lastUpdated: Date.now(),
                    completed: isNewChat // Mark as completed if a new chat is being created
                };
                setChatHistory(updatedHistory);
            } else {
                // Add new chat to history
                setChatHistory(prev => [
                    ...prev,
                    {
                        id: currentChatId,
                        title: chatTitle,
                        data: currentChatData,
                        lastUpdated: Date.now(),
                        completed: isNewChat // Mark as completed if a new chat is being created
                    }
                ]);
            }
        }
    };
    
    const loadChat = (chatId) => {
        // Save current chat before switching
        saveCurrentChat();
        
        // Find the chat by ID
        const selectedChat = chatHistory.find(chat => chat.id === chatId);
        if (selectedChat) {
            setCurrentChatId(selectedChat.id);
            setCurrentChatData(selectedChat.data);
            setShowResult(selectedChat.data.length > 0);
            
            // Set the recent prompt to the first message in the chat
            const firstUserMessage = selectedChat.data.find(msg => msg.role === 'user');
            setRecentPrompt(firstUserMessage?.parts[0]?.text || "Chat");
            
            // If this was a completed chat, mark it as active again
            if (selectedChat.completed) {
                const updatedHistory = [...chatHistory];
                const chatIndex = updatedHistory.findIndex(chat => chat.id === chatId);
                if (chatIndex !== -1) {
                    updatedHistory[chatIndex] = {
                        ...updatedHistory[chatIndex],
                        completed: false,
                        lastUpdated: Date.now()
                    };
                    setChatHistory(updatedHistory);
                }
            }
        }
    };

    const onSent = async (prompt) => {
        setResultData("");
        setLoading(true);
        setShowResult(true);
        
        let response;
        try {
            if (prompt !== undefined) {
                response = await run(prompt);
                setRecentPrompt(prompt);
                setPrevPrompts((prev) => [...prev, prompt]);
                
                // Add user message to current chat data
                const userMessage = { role: "user", parts: [{ text: prompt }] };
                setCurrentChatData(prev => [...prev, userMessage]);
            } else {
                setPrevPrompts((prev) => [...prev, input]);
                setRecentPrompt(input);
                response = await run(input);
                
                // Add user message to current chat data
                const userMessage = { role: "user", parts: [{ text: input }] };
                setCurrentChatData(prev => [...prev, userMessage]);
            }

            // Process and display the response
            let responseArray = response.split("**");
            let newResponse = responseArray.map((item, i) =>
                i % 2 !== 1 ? item : `<b>${item}</b>`
            ).join("");

            let newResponse2 = newResponse.split("*").join("</br>");
            let newResponseArray = newResponse2.split(" ");

            // Add model response to current chat data immediately
            const modelMessage = { role: "model", parts: [{ text: response }] };
            setCurrentChatData(prev => [...prev, modelMessage]);
            
            // Animating text display
            newResponseArray.forEach((word, i) => {
                delayPara(i, word + " ");
            });

            setLoading(false);
            setInput("");
        } catch (error) {
            console.error("Error in onSent:", error);
            
            // Add error message to chat data
            const errorMessage = { 
                role: "model", 
                parts: [{ text: "Sorry, there was an error processing your request." }] 
            };
            setCurrentChatData(prev => [...prev, errorMessage]);
            
            setLoading(false);
            setInput("");
        }
    };

    const onImgUpload = async (imageURL, clearImage) => {
        setResultData("");
        setLoading(true);
        setShowResult(true);

        let response;
        let userMessage;
        
        if (imageURL) {
            response = await imageInput(imageURL);
            setRecentPrompt("Image Uploaded");
            setPrevPrompts((prev) => [...prev, "Image Uploaded"]);
            
            // Add user message with image to current chat data
            userMessage = { 
                role: "user", 
                parts: [{ text: "Image Uploaded", image: true }],
                imageUrl: imageURL 
            };
        } else {
            setPrevPrompts((prev) => [...prev, input]);
            setRecentPrompt(input);
            response = await imageInput(input);
            
            // Add user message to current chat data
            userMessage = { role: "user", parts: [{ text: input }] };
        }
        
        setCurrentChatData(prev => [...prev, userMessage]);

        let responseArray = response.split("**");
        let newResponse = responseArray.map((item, i) =>
            i % 2 !== 1 ? item : `<b>${item}</b>`
        ).join("");

        let newResponse2 = newResponse.split("*").join("</br>");
        let newResponseArray = newResponse2.split(" ");

        newResponseArray.forEach((word, i) => {
            delayPara(i, word + " ");
        });
        
        // Add model response to current chat data
        const modelMessage = { role: "model", parts: [{ text: response }] };
        setCurrentChatData(prev => [...prev, modelMessage]);

        setLoading(false);
        setInput("");

        if (clearImage) {
            clearImage();
        }
    };

    const contextValue = {
        prevPrompts,
        setPrevPrompts,
        onSent,
        setRecentPrompt,
        recentPrompt,
        showResult,
        loading,
        resultData,
        input,
        setInput,
        newChat,
        onImgUpload,
        chatHistory,
        loadChat,
        currentChatData,
        setCurrentChatData,
        currentChatId,
        saveCurrentChat
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;
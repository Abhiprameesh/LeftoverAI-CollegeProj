import React, { useContext, useState, useEffect } from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'

const Sidebar = ({ onExtendChange }) => {
    const [extended, setExtended] = useState(false)
    const { 
        setRecentPrompt, 
        newChat, 
        chatHistory, 
        loadChat, 
        currentChatId 
    } = useContext(Context)

    // Notify parent component when extension state changes
    useEffect(() => {
        if (onExtendChange) {
            onExtendChange(extended);
        }
    }, [extended, onExtendChange]);

    // Get completed chats and active chat
    const completedChats = chatHistory.filter(chat => chat.completed);
    const activeChat = chatHistory.find(chat => chat.id === currentChatId);

    const handleLoadChat = (chatId) => {
        loadChat(chatId);
        // If on mobile or small screens, collapse sidebar after selection
        if (window.innerWidth <= 768) {
            setExtended(false);
        }
    }

    const toggleExtended = () => {
        setExtended(prev => !prev);
    }

    return (
        <div className={`sidebar ${extended ? 'extended' : ''}`}>
            <div className="top">
                <img onClick={toggleExtended} className='menu' src={assets.menu_icon} alt="" />
                <div onClick={() => newChat()} className="new-chat">
                    <img src={assets.plus_icon} alt="" />
                    {extended ? <p>New Chat</p> : null}
                </div>
                
                {/* Current chat section */}
                {extended && activeChat && !activeChat.completed ?
                    <div className="active-chat">
                        <p className="active-chat-title">Current Chat</p>
                        <div key={activeChat.id} onClick={() => handleLoadChat(activeChat.id)} className="active-chat-entry">
                            <img src={assets.chat_icon} alt="" />
                            <p>{activeChat.title.slice(0, 18)} ...</p>
                        </div>
                    </div>
                    : null
                }

                {/* Previous conversations section */}
                {extended && completedChats.length > 0 ?
                    <div className="conversations">
                        <p className="conversations-title">Previous Conversations</p>
                        {completedChats.map((chat) => {
                            return (
                                <div key={chat.id} onClick={() => handleLoadChat(chat.id)} className="conversation-entry">
                                    <img src={assets.chat_icon} alt="" />
                                    <p>{chat.title.slice(0, 18)} ...</p>
                                </div>
                            )
                        })}
                    </div>
                    : null
                }
            </div>
            <div className="bottom">
                <div className="bottom-item recent-entry">
                    <img src={assets.question_icon} alt="" />
                    {extended ? <p>Help</p> : null}
                </div>
                <div className="bottom-item recent-entry">
                    <img src={assets.history_icon} alt="" />
                    {extended ? <p>Activity</p> : null}
                </div>
                <div className="bottom-item recent-entry">
                    <img src={assets.setting_icon} alt="" />
                    {extended ? <p>Settings</p> : null}
                </div>
            </div>
        </div>
    )
}

export default Sidebar 
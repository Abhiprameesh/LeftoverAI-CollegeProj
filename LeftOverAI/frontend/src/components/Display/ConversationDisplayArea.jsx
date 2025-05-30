import React from "react";
import Markdown from "react-markdown";
import { assets } from "../../assets/assets";

const { gemini_icon, user_icon } = assets;

const ChatArea = ({ data, streamdiv, answer }) => {
  // Function to format timestamps
  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area">
      {data?.length <= 0 ? (
        <div className="welcome-area">
          <div className="welcome-icon">🍽️</div>
          <div className="welcome-1">Welcome to Leftover Chef AI</div>
          <div className="welcome-2">Upload a food image or ask a question to get started</div>
        </div>
      ) : (
        <div className="welcome-area" style={{ display: "none" }}></div>
      )}

      {data.map((element, index) => (
        <div key={index} className={element.role}>
          <div className="message-header">
            <img
              src={element.role === "user" ? user_icon : gemini_icon}
              alt={element.role === "user" ? "You" : "AI"}
              className="avatar"
            />
            <div className="message-info">
              <span className="message-sender">{element.role === "user" ? "You" : "Leftover Chef AI"}</span>
              <span className="message-time">{formatTime()}</span>
            </div>
          </div>
          <div className="message-content">
            {/* Display the image if it exists */}
            {element.imageUrl && (
              <div className="message-image">
                <img
                  src={element.imageUrl}
                  alt="Food image"
                  className="user-uploaded-image"
                />
                <div className="image-caption">Uploaded Food Image</div>
              </div>
            )}
            {/* Show processing indicator for messages that are still processing */}
            {element.isProcessing ? (
              <div className="processing-message">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="message-text">
                  <p>{element.parts[0].text}</p>
                </div>
              </div>
            ) : (
              <div className="message-text">
                <Markdown children={element.parts[0].text} />
              </div>
            )}
          </div>
        </div>
      ))}

      {streamdiv && (
        <div className="model">
          <div className="message-header">
            <img src={gemini_icon} alt="AI" className="avatar" />
            <div className="message-info">
              <span className="message-sender">Leftover Chef AI</span>
              <span className="message-time">{formatTime()}</span>
            </div>
          </div>
          {answer && (
            <div className="message-content">
              <div className="message-text">
                <Markdown children={answer} />
              </div>
            </div>
          )}
        </div>
      )}

      <span id="checkpoint"></span>
    </div>
  );
};

export default ChatArea;

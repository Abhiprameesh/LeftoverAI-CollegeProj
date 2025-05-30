import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Main.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import { flushSync } from "react-dom";
import ConversationDisplayArea from "../Display/ConversationDisplayArea.jsx";
import Background from '../Background/Background';
import SimpleBackground from '../Background/SimpleBackground';
import Sidebar from "../Sidebar/Sidebar";

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Background component failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const Main = () => {
  // References and URLs
  const inputRef = useRef();
  const host = "http://localhost:9000";
  const url = host + "/chat";
  const imageUrl = host + "/image";
  
  // State variables
  const [data, setData] = useState([]);
  const [input, setInput] = useState("");
  const [selectedImg, setSelectedImg] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sidebarExtended, setSidebarExtended] = useState(false);

  // Context hooks
  const { setPrevPrompts, setRecentPrompt, newChat, currentChatData, setCurrentChatData } = useContext(Context);
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Sync conversation data between Main component and Context
  useEffect(() => {
    // If context has conversation data on initial load, use it
    if (currentChatData.length > 0 && data.length === 0) {
      setData(currentChatData);
      setShowResult(true);
    }
    // When currentChatData changes (like when loading a previous chat), update local data
    else if (currentChatData.length > 0) {
      setData(currentChatData);
      setShowResult(true);
    }
  }, [currentChatData, setData]);

  // Allow guest mode
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("User is not authenticated - using app in guest mode");
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    setData([]);
    setShowResult(false);
    setInput("");
    newChat();
  };

  // Scroll to bottom of conversation display area, not the whole page
  function executeScroll() {
    const resultData = document.querySelector('.result-data');
    if (resultData) {
      resultData.scrollTop = resultData.scrollHeight;
    }
  }

  // Validate input
  function validationCheck(str) {
    return str === null || str.match(/^\s*$/) !== null;
  }

  // Clean up history for API
  function cleanupHistory(history) {
    console.log("Cleaning up history with length:", history.length);
    const recentHistory = history.slice(-10);
    return recentHistory
      .map((item) => {
        // Skip processing messages
        if (
          item.parts &&
          item.parts[0] &&
          (item.parts[0].text === "Processing voice message..." || 
           item.parts[0].text === "Recording... Speak now" ||
           item.isProcessing)
        ) {
          return null;
        }

        // Handle image entries
        if (item.imageUrl) {
          const text = item.parts[0]?.text || "User shared an image.";
          return {
            role: item.role,
            parts: [{ text: text }],
          };
        }

        // Handle normal text entries
        if (item.parts && item.parts.length > 0) {
          const cleanedItem = {
            role: item.role,
            parts: item.parts
              .map((part) => {
                if (part.text) {
                  return { text: part.text.trim() };
                }
                return null;
              })
              .filter((part) => part !== null),
          };

          if (cleanedItem.parts && cleanedItem.parts.length > 0) {
            return cleanedItem;
          }
        }
        return null;
      })
      .filter((item) => item !== null);
  }

  // Handle text input submission
  const handleClick = () => {
    if (validationCheck(input) && !selectedImg) {
      console.log("Empty or invalid entry");
      return;
    }

    setShowResult(true);
    setErrorMsg("");

    // Add current user message to history
    const userMessage = { role: "user", parts: [{ text: input }] };
    const ndata = [...data, userMessage];
    setData(ndata);
    
    // Update sidebar and prepare UI
    setRecentPrompt(input);
    setPrevPrompts((prev) => [...prev, input]);
    setInput("");
    setWaiting(true);
    executeScroll();

    // Send to server
    handleNonStreamingChat(ndata);
  };

  // Handle non-streaming chat
  const handleNonStreamingChat = async (history) => {
    const cleanedHistory = cleanupHistory(history);
    const chatData = {
      chat: input,
      history: cleanedHistory,
    };

    // Update UI state
    flushSync(() => {
      setData(history);
      setInput("");
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
    });
    executeScroll();

    // Send request to server
    const headerConfig = {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
    };

    try {
      const response = await axios.post(url, chatData, headerConfig);
      const modelResponse = response.data.text;
      
      // Update with response
      const updatedData = [
        ...history,
        { role: "model", parts: [{ text: modelResponse }] },
      ];

      flushSync(() => {
        setData(updatedData);
        // Update context with the new data
        setCurrentChatData(updatedData);
        inputRef.current.placeholder = "Enter a message.";
        setWaiting(false);
      });
      executeScroll();
    } catch (error) {
      console.error("Chat error:", error);
      const errorResponse = "Error occurred: " + (error.response?.data?.text || error.message);
      
      const updatedData = [
        ...history,
        { role: "model", parts: [{ text: errorResponse }] },
      ];

      flushSync(() => {
        setData(updatedData);
        // Update context with the new data
        setCurrentChatData(updatedData);
        inputRef.current.placeholder = "Enter a message.";
        setWaiting(false);
      });
      executeScroll();
    }
  };

  // Resize image before uploading
  const resizeImage = (
    file,
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.6
  ) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          // Set dimensions
          const targetWidth = Math.min(maxWidth, 800);
          const targetHeight = Math.min(maxHeight, 600);
          let width = img.width;
          let height = img.height;
          const aspectRatio = width / height;
          
          if (aspectRatio > 1) {
            width = targetWidth;
            height = Math.round(width / aspectRatio);
            if (height > targetHeight) {
              height = targetHeight;
              width = Math.round(height * aspectRatio);
            }
          } else {
            height = targetHeight;
            width = Math.round(height * aspectRatio);
            if (width > targetWidth) {
              width = targetWidth;
              height = Math.round(width / aspectRatio);
            }
          }

          // Create canvas and resize
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Set quality and compress
          let imageQuality = Math.min(quality, 0.5);
          let resizedImage = canvas.toDataURL("image/jpeg", imageQuality);
          const approximateSizeInMB = (resizedImage.length * 0.75) / (1024 * 1024);
          
          // Reduce quality if too large
          if (approximateSizeInMB > 2.5) {
            let newQuality = imageQuality;
            while (newQuality > 0.1 && (resizedImage.length * 0.75) / (1024 * 1024) > 2.5) {
              newQuality -= 0.1;
              resizedImage = canvas.toDataURL("image/jpeg", newQuality);
            }
          }

          resolve(resizedImage);
        };
      };
    });
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setErrorMsg("");
      const resizedImage = await resizeImage(file);
      console.log("Image selected and resized successfully");
      setSelectedImg(resizedImage);
    } catch (error) {
      console.error("Error processing image upload:", error);
      setErrorMsg("Failed to process image. Please try a different image.");
    }
  };

  // Handle image processing
  const handleImageProcessing = async () => {
    if (!selectedImg) return;

    setShowResult(true);
    setErrorMsg("");

    // Add user's image to conversation
    const ndata = [
      ...data,
      {
        role: "user",
        parts: [
          {
            text: input || "Please analyze this image.",
            image: true,
          },
        ],
        imageUrl: selectedImg,
      },
    ];

    // Add processing message
    const processingData = [
      ...ndata,
      { 
        role: "model", 
        parts: [{ 
          text: "Analyzing image... this may take up to 30 seconds. Please wait." 
        }],
        isProcessing: true 
      },
    ];

    // Update UI
    setRecentPrompt("Image Upload");
    setPrevPrompts((prev) => [...prev, "Image Upload"]);
    flushSync(() => {
      setData(processingData);
      setCurrentChatData(ndata); // Update context with user message but not processing message
      setInput("");
      setWaiting(true);
      inputRef.current.placeholder = "Waiting for model's response";
    });
    executeScroll();

    // Process image with retries
    const attemptImageProcessing = async (retryCount = 0) => {
      try {
        const response = await axios.post(imageUrl, {
          image: selectedImg,
          prompt: input || "You are a chef. Provide recipe suggestions based on the uploaded image of leftover food.",
          history: cleanupHistory(data),
        }, {
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
        });
        
        const modelResponse = response.data.text;
        const updatedData = ndata.filter(item => !item.isProcessing);
        const finalData = [
          ...updatedData,
          { role: "model", parts: [{ text: modelResponse }] },
        ];

        flushSync(() => {
          setData(finalData);
          setCurrentChatData(finalData); // Update context with final data
          setWaiting(false);
          inputRef.current.placeholder = "Enter a message.";
        });
        setSelectedImg(null);
        executeScroll();
      } catch (error) {
        console.error(`Error processing image (attempt ${retryCount + 1}):`, error);
        
        // Retry logic
        if (retryCount < 2 && (error.code === 'ECONNABORTED' || !error.response)) {
          const retryDelay = 2000;
          
          const updatedData = data.map(item => {
            if (item.isProcessing) {
              return {
                ...item,
                parts: [{ text: `Still processing... (attempt ${retryCount + 2})` }]
              };
            }
            return item;
          });
          
          flushSync(() => { setData(updatedData); });
          executeScroll();
          setTimeout(() => attemptImageProcessing(retryCount + 1), retryDelay);
          return;
        }

        // Handle error
        let errorMessage = "Error processing image: ";
        
        // Check for quota/rate limit errors
        if (error.response?.data?.text && error.response.data.text.includes("quota")) {
          errorMessage = "The AI service has reached its request limit. Please try again later or use text queries instead.";
        } else if (error.response?.data?.text && error.response.data.text.includes("429 Too Many Requests")) {
          errorMessage = "The AI service is currently busy. Please wait a few minutes before trying again.";
        } else if (error.response) {
          errorMessage += error.response.data?.text || `Server error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage += "No response from server. Please check your connection or try with a smaller image.";
        } else {
          errorMessage += error.message;
        }

        const updatedData = ndata.filter(item => !item.isProcessing);
        const finalData = [
          ...updatedData,
          { role: "model", parts: [{ text: errorMessage }] },
        ];

        flushSync(() => {
          setData(finalData);
          setCurrentChatData(finalData); // Update context with error response
          setWaiting(false);
          inputRef.current.placeholder = "Enter a message.";
        });
        setSelectedImg(null);
        executeScroll();
      }
    };
    
    attemptImageProcessing();
  };

  // State monitoring hooks
  useEffect(() => {
    if (input.trim().length > 0 && selectedImg) {
      setSelectedImg(null);
    }
  }, [input]);

  useEffect(() => {
    if (selectedImg) {
      setShowResult(true);
    }
  }, [selectedImg]);

  // Reset chat
  const handleNewChat = () => {
    // Clear local state
    setData([]);
    setShowResult(false);
    setInput("");
    setSelectedImg(null);
    setWaiting(false);
    setErrorMsg("");
    
    // Call newChat in Context which will save current chat and start a new one
    newChat();
  };

  // Handle sidebar extension
  const handleSidebarExtension = (isExtended) => {
    setSidebarExtended(isExtended);
  }

  return (
    <div className="main">
      <Sidebar onExtendChange={handleSidebarExtension} />
      <div className={`main-container ${sidebarExtended ? 'sidebar-extended' : ''}`}>
        <ErrorBoundary fallback={<SimpleBackground />}>
          <Background />
        </ErrorBoundary>
        <div className="nav-bar">
          <div className="nav">
            <p>Leftover Chef AI</p>
            <div className="user-actions">
              {isAuthenticated ? (
                <>
                  <span className="user-email">{user?.fullName || (user?.email ? user.email.split('@')[0] : 'User')}</span>
                  <button onClick={handleLogout} className="logout-button">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="login-button">Login</button>
                  <button onClick={() => navigate('/signup')} className="signup-button">Sign Up</button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="content">
          {!showResult ? (
            <div className="greet">
              <p>
                <span>Welcome {isAuthenticated ? `${user?.fullName || (user?.email ? user.email.split('@')[0] : '')}` : 'to Leftover Chef AI'}</span>
                Upload a photo of your leftover food and our AI will identify ingredients and suggest delicious recipes!
              </p>
              <div className="feature-list">
                <div className="feature">
                  <div className="feature-icon">📷</div>
                  <div className="feature-text">
                    <h3>Upload Food Photos</h3>
                    <p>Take a picture of ingredients or leftovers</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🍲</div>
                  <div className="feature-text">
                    <h3>Get Recipe Ideas</h3>
                    <p>Receive custom recipe suggestions</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🔍</div>
                  <div className="feature-text">
                    <h3>Ask Questions</h3>
                    <p>Get cooking tips and advice</p>
                  </div>
                </div>
              </div>
              
              {!isAuthenticated && (
                <div className="auth-cta">
                  <p>Create an account to save your recipes and conversation history</p>
                  <div className="auth-buttons">
                    <button onClick={() => navigate('/login')} className="login-cta">Login</button>
                    <button onClick={() => navigate('/signup')} className="signup-cta">Sign Up</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="result">
              <div className="result-title">
                <img src={assets.gemini_icon} alt="Gemini" />
                <p>Recipe Assistant</p>
                <button onClick={handleNewChat} className="new-chat-button">
                  <span>+</span> New Chat
                </button>
              </div>
              <div className="result-data">
                <ConversationDisplayArea data={data} />
                {waiting && (
                  <div className="loader">
                    <hr />
                    <hr />
                    <hr />
                    <hr />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="main-bottom">
            <div className="search-box">
              <input
                ref={inputRef}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                type="text"
                placeholder={
                  waiting
                    ? "Generating recipe suggestions..."
                    : "Ask about recipes or upload a food image..."
                }
                disabled={waiting}
                onKeyPress={(e) => e.key === 'Enter' && !waiting && (input.trim() || selectedImg) && (selectedImg ? handleImageProcessing() : handleClick())}
              />
              <div>
                <label htmlFor="image-upload" className={waiting ? "disabled" : ""}>
                  <img
                    src={assets.gallery_icon}
                    alt="Upload Food Image"
                    title="Upload Food Image"
                    className="tool-icon"
                  />
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                  disabled={waiting}
                />

                <div className="send-button-container">
                  <button
                    className={`send-button ${(Boolean(input.trim()) || Boolean(selectedImg)) && !waiting ? 'active' : 'disabled'}`}
                    onClick={() => {
                      if (waiting) return;
                      if (selectedImg) {
                        handleImageProcessing();
                      } else if (input.trim()) {
                        handleClick();
                      }
                    }}
                    disabled={waiting || (!input.trim() && !selectedImg)}
                    title={selectedImg ? "Process Image" : "Send Message"}
                  >
                    <img src={assets.send_icon} alt="Send" />
                  </button>
                </div>
              </div>
            </div>
            {selectedImg && (
              <div className="image-preview">
                <img src={selectedImg} alt="Selected" className="selected-img-preview" />
                <button 
                  className="remove-image-btn"
                  onClick={() => setSelectedImg(null)}
                  title="Remove image"
                >×</button>
              </div>
            )}
            <p className="bottom-info">
              Leftover Chef AI identifies ingredients in your images and suggests creative recipes. For best results, use clear photos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;

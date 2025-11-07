import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, PublicUser, Usuario, Comercio } from '../types';
import * as api from '../apiService';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);

interface ChatPageProps {
  currentUser: PublicUser | Usuario;
  targetComercio: Comercio | null;
  onViewComercio: (comercio: Comercio) => void;
  onUnreadCountChange: (newCount: number) => void;
  onClearTarget: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ currentUser, targetComercio, onViewComercio, onUnreadCountChange, onClearTarget }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isComerciante = !('apellido' in currentUser);

  const fetchConversations = useCallback(async () => {
    try {
      const convos = await api.getConversations(currentUser.id);
      setConversations(convos);
      
      const totalUnread = convos.reduce((acc, c) => {
          const unreadCount = isComerciante ? c.unreadByComercio : c.unreadByCliente;
          return acc + unreadCount;
      }, 0);
      onUnreadCountChange(totalUnread);

    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUser.id, isComerciante, onUnreadCountChange]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.getMessagesForConversation(conversationId);
      setMessages(msgs);
      await api.markConversationAsRead(conversationId, currentUser.id);
      fetchConversations(); // Recargar conversaciones para actualizar contadores
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser.id, fetchConversations]);

  // Polling para conversaciones y mensajes
  useEffect(() => {
    fetchConversations();
    const conversationInterval = setInterval(fetchConversations, 5000); // Poll every 5 seconds
    return () => clearInterval(conversationInterval);
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      const messageInterval = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 5000); // Poll every 5 seconds
      return () => clearInterval(messageInterval);
    }
  }, [selectedConversation, fetchMessages]);

  // Manejar el targetComercio para iniciar un chat
  useEffect(() => {
    if (targetComercio && !isComerciante) {
      const startChat = async () => {
        try {
          const conversation = await api.startOrGetConversation(currentUser.id, targetComercio.id);
          setSelectedConversation(conversation);
          onClearTarget();
        } catch (error) {
          console.error("Error starting chat", error);
        }
      };
      startChat();
    }
  }, [targetComercio, currentUser.id, isComerciante, onClearTarget]);

  // Seleccionar una conversación
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    fetchMessages(conversation.id);
  };

  // Enviar un mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const sentMessage = await api.sendMessage(selectedConversation.id, currentUser.id, newMessage);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      fetchConversations(); // Actualizar la lista para que esta conversación suba
    } catch (error) {
      console.error("Error sending message:", error);
      alert("No se pudo enviar el mensaje.");
    }
  };
  
  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Bandeja de Entrada</h1>
      <div className="bg-white rounded-xl shadow-lg h-[75vh] flex">
        {/* Columna de Conversaciones */}
        <div className={`w-1/3 border-r border-gray-200 flex flex-col ${!selectedConversation && 'w-full md:w-1/3'}`}>
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Conversaciones</h2>
          </div>
          <div className="overflow-y-auto flex-grow">
            {loadingConversations ? (
              <LoadingSpinner />
            ) : conversations.length > 0 ? (
              conversations.map(convo => {
                const unreadCount = isComerciante ? convo.unreadByComercio : convo.unreadByCliente;
                const participantName = isComerciante ? convo.clienteNombre : convo.comercioNombre;
                const participantImage = convo.comercioImagenUrl;
                
                return (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={`p-4 flex items-center cursor-pointer hover:bg-gray-100 ${selectedConversation?.id === convo.id ? 'bg-indigo-50' : ''}`}
                  >
                    <img src={participantImage} alt={participantName} className="w-12 h-12 rounded-full object-cover mr-4" />
                    <div className="flex-grow overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold truncate">{participantName}</p>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{convo.lastMessageSenderId === currentUser.id ? 'Tú: ' : ''}{convo.lastMessage || 'No hay mensajes'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No tenés conversaciones.</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna de Mensajes */}
        <div className={`w-2/3 flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              <div className="p-4 border-b flex items-center">
                <img src={selectedConversation.comercioImagenUrl} alt={selectedConversation.comercioNombre} className="w-10 h-10 rounded-full object-cover mr-3" />
                <h2 className="text-xl font-bold">{isComerciante ? selectedConversation.clienteNombre : selectedConversation.comercioNombre}</h2>
              </div>
              <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
                {loadingMessages ? (
                  <LoadingSpinner />
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex my-2 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-sm ${msg.senderId === currentUser.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribí un mensaje..."
                    className="flex-grow p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-indigo-700">
                    Enviar
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-500">
              <p>Seleccioná una conversación para ver los mensajes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
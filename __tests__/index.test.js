// Mock react-native NativeModules before importing
const mockMethods = {
  td_json_client_create: jest.fn(),
  td_json_client_execute: jest.fn(),
  td_json_client_send: jest.fn(),
  td_json_client_receive: jest.fn(),
  getTextEntities: jest.fn(),
  startTdLib: jest.fn(),
  login: jest.fn(),
  verifyPhoneNumber: jest.fn(),
  verifyPassword: jest.fn(),
  getProfile: jest.fn(),
  getAuthorizationState: jest.fn(),
  logout: jest.fn(),
  destroy: jest.fn(),
  getChat: jest.fn(),
  openChat: jest.fn(),
  closeChat: jest.fn(),
  searchPublicChat: jest.fn(),
  searchChats: jest.fn(),
  joinChat: jest.fn(),
  leaveChat: jest.fn(),
  createPrivateChat: jest.fn(),
  getChatMember: jest.fn(),
  getSupergroup: jest.fn(),
  loadChats: jest.fn(),
  getChats: jest.fn(),
  getMessage: jest.fn(),
  getChatHistory: jest.fn(),
  sendMessage: jest.fn(),
  getMessagesCompat: jest.fn(),
  viewMessages: jest.fn(),
  getChatMessagePosition: jest.fn(),
  getMessageThread: jest.fn(),
  getMessageThreadHistory: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
  addMessageReaction: jest.fn(),
  removeMessageReaction: jest.fn(),
  getAddedReactions: jest.fn(),
  getUserProfile: jest.fn(),
  getUserFull: jest.fn(),
  getUserProfilePhotos: jest.fn(),
  getUsersCompat: jest.fn(),
  downloadFile: jest.fn(),
  downloadFileByRemoteId: jest.fn(),
  cancelDownloadFile: jest.fn(),
  cancelDownloadByRemoteId: jest.fn(),
  getFile: jest.fn(),
  getOption: jest.fn(),
  setOption: jest.fn(),
  echoToJs: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    TdLibModule: mockMethods,
  },
}));

const TdLib = require('../index').default;

describe('react-native-tdlib', () => {
  describe('module export', () => {
    it('exports a default object', () => {
      expect(TdLib).toBeDefined();
      expect(typeof TdLib).toBe('object');
    });

    it('exports all expected methods', () => {
      const expectedMethods = Object.keys(mockMethods);
      for (const method of expectedMethods) {
        expect(TdLib).toHaveProperty(method);
        expect(typeof TdLib[method]).toBe('function');
      }
    });

    it('does not export extra unexpected methods', () => {
      const exportedKeys = Object.keys(TdLib);
      const expectedKeys = Object.keys(mockMethods);
      expect(exportedKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('method count', () => {
    it('exports exactly 52 methods', () => {
      expect(Object.keys(TdLib)).toHaveLength(52);
    });
  });

  describe('Base API methods', () => {
    it('delegates td_json_client_create to native module', () => {
      TdLib.td_json_client_create();
      expect(mockMethods.td_json_client_create).toHaveBeenCalled();
    });

    it('delegates td_json_client_send to native module', () => {
      const request = { '@type': 'getChat', chat_id: 123 };
      TdLib.td_json_client_send(request);
      expect(mockMethods.td_json_client_send).toHaveBeenCalledWith(request);
    });

    it('delegates td_json_client_execute to native module', () => {
      const request = { '@type': 'setLogVerbosityLevel', new_verbosity_level: 0 };
      TdLib.td_json_client_execute(request);
      expect(mockMethods.td_json_client_execute).toHaveBeenCalledWith(request);
    });

    it('delegates td_json_client_receive to native module', () => {
      TdLib.td_json_client_receive();
      expect(mockMethods.td_json_client_receive).toHaveBeenCalled();
    });

    it('delegates getTextEntities to native module', () => {
      TdLib.getTextEntities('@telegram #test');
      expect(mockMethods.getTextEntities).toHaveBeenCalledWith('@telegram #test');
    });
  });

  describe('High-level API methods', () => {
    it('delegates startTdLib with parameters', () => {
      const params = { api_id: 12345, api_hash: 'test_hash' };
      TdLib.startTdLib(params);
      expect(mockMethods.startTdLib).toHaveBeenCalledWith(params);
    });

    it('delegates login with user details', () => {
      const details = { countrycode: '+1', phoneNumber: '1234567890' };
      TdLib.login(details);
      expect(mockMethods.login).toHaveBeenCalledWith(details);
    });

    it('delegates getChat with chatId', () => {
      TdLib.getChat(12345);
      expect(mockMethods.getChat).toHaveBeenCalledWith(12345);
    });

    it('delegates sendMessage with chatId and text', () => {
      TdLib.sendMessage(12345, 'Hello');
      expect(mockMethods.sendMessage).toHaveBeenCalledWith(12345, 'Hello', 0);
    });

    it('delegates sendMessage with replyToMessageId', () => {
      TdLib.sendMessage(12345, 'Hi', 555);
      expect(mockMethods.sendMessage).toHaveBeenCalledWith(12345, 'Hi', 555);
    });

    it('delegates getOption with name', () => {
      TdLib.getOption('version');
      expect(mockMethods.getOption).toHaveBeenCalledWith('version');
    });

    it('delegates setOption with name and value', () => {
      const value = { type: 'boolean', value: true };
      TdLib.setOption('online', value);
      expect(mockMethods.setOption).toHaveBeenCalledWith('online', value);
    });

    it('delegates loadChats with limit', () => {
      TdLib.loadChats(20);
      expect(mockMethods.loadChats).toHaveBeenCalledWith(20);
    });

    it('delegates getChats with limit', () => {
      TdLib.getChats(20);
      expect(mockMethods.getChats).toHaveBeenCalledWith(20);
    });
  });
});

describe('react-native-tdlib (module not linked)', () => {
  it('throws when TdLibModule is null', () => {
    jest.resetModules();
    jest.mock('react-native', () => ({
      NativeModules: {
        TdLibModule: null,
      },
    }));

    expect(() => require('../index')).toThrow(
      'TdLibModule not linked. Make sure the library is properly installed.'
    );
  });
});

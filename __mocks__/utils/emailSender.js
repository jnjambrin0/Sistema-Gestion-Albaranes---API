module.exports = {
  sendValidationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendInvitationEmail: jest.fn().mockResolvedValue({ success: true }),
}; 
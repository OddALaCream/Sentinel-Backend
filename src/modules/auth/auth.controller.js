const { z, validate } = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);

  return res.status(201).json({
    success: true,
    message: data.session
      ? 'User registered successfully'
      : 'User registered successfully. Check your email if confirmation is enabled.',
    data
  });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data
  });
});

module.exports = {
  registerSchema: validate(registerSchema),
  loginSchema: validate(loginSchema),
  register,
  login
};

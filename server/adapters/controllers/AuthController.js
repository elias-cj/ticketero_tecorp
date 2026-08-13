export class AuthController {
  constructor({ authenticateUserUseCase }) {
    this.authenticateUserUseCase = authenticateUserUseCase;
  }

  async login(req, res, next) {
    try {
      const { p_email, p_password, email, password } = req.body || {};
      const targetEmail = p_email || email;
      const targetPassword = p_password || password;

      const result = await this.authenticateUserUseCase.execute({
        email: targetEmail,
        password: targetPassword,
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async me(req, res) {
    return res.json({
      user: req.user,
    });
  }
}

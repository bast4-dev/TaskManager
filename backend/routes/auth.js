const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Joi = require('joi');
const logger = require('../config/logger');
const { joiPasswordExtendCore } = require('joi-password');
const joiPassword = Joi.extend(joiPasswordExtendCore);

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.empty': "Le nom d'utilisateur est obligatoire.",
    'any.required': "Le nom d'utilisateur est obligatoire.",
    'string.min': "Le nom d'utilisateur doit contenir au moins {#limit} caractères.",
    'string.max': "Le nom d'utilisateur ne doit pas dépasser {#limit} caractères.",
  }),
  password: joiPassword
    .string()
    .min(12)
    .minOfUppercase(1)
    .minOfLowercase(1)
    .minOfNumeric(1)
    .minOfSpecialCharacters(1)
    .noWhiteSpaces()
    .required()
    .messages({
      'string.empty': 'Le mot de passe est obligatoire.',
      'any.required': 'Le mot de passe est obligatoire.',
      'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères.',
      'password.minOfUppercase': 'Le mot de passe doit contenir au moins {#min} majuscule.',
      'password.minOfLowercase': 'Le mot de passe doit contenir au moins {#min} minuscule.',
      'password.minOfNumeric': 'Le mot de passe doit contenir au moins {#min} chiffre.',
      'password.minOfSpecialCharacters': 'Le mot de passe doit contenir au moins {#min} caractère spécial.',
      'password.noWhiteSpaces': "Le mot de passe ne doit pas contenir d'espaces.",
    }),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * Inscrit un nouvel utilisateur.
 *
 * Valide le corps de la requête avec Joi (username de 3 à 30 caractères,
 * mot de passe fort d'au moins 12 caractères), vérifie que le username
 * n'existe pas déjà, hache le mot de passe avec bcrypt, puis renvoie un token JWT.
 *
 * @name POST /api/auth/register
 * @function
 * @param {Object} req - Requête Express ; `req.body` doit contenir `username` et `password`.
 * @param {Object} res - Réponse Express.
 * @returns {void} Répond en JSON : `{ token }` (200) ou `{ msg }` (400 / 500).
 */
router.post('/register', async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { username, password } = req.body;

  // Un mot de passe vide ou un nom d'utilisateur trop court sont acceptés.
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ username, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * Authentifie un utilisateur et renvoie un token JWT.
 *
 * Valide le corps avec Joi, vérifie l'existence de l'utilisateur et la
 * correspondance du mot de passe (bcrypt), puis renvoie un token JWT signé.
 *
 * @name POST /api/auth/login
 * @function
 * @param {Object} req - Requête Express ; `req.body` doit contenir `username` et `password`.
 * @param {Object} res - Réponse Express.
 * @returns {void} JSON : `{ token }` (200) ou `{ msg: 'Identifiants incorrects' }` (400).
 */
router.post('/login', async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: 'Identifiants incorrects' });
  }

  const { username, password } = req.body;
  
  try {
    // Le message d'erreur est trop générique et ne guide pas l'utilisateur.
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Identifiants incorrects' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Identifiants incorrects' });
    }

    const payload = { user: { id: user.id } };
    // La durée de vie du token est peut-être trop longue pour certaines applications.
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

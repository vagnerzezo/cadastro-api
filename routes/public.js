import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { PrismaClient } from "../generated/prisma/client.ts"

const router = express.Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET

router.post('/register', async (req, res) => {
    try {
        const user = req.body

        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(user.password, salt)

        const userDB = await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                password: hash,
                age: user.age
            }
        })


        res.status(201).json(userDB)

    } catch (error) {
        res.status(500).json({ message: "Erro no servidor, tente novamente mais tarde." })
    }

})

router.post('/login', async (req, res) => {
    try {
        const userInfo = req.body

        const user = await prisma.user.findUnique({ where: { email: userInfo.email } })
        if (!user) {
            return res.status(404).json({ message: "Não foi possível encontrar um usuário " })
        }

        const isMatch = await bcrypt.compare(userInfo.password, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Senha errada" })
        }


        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" })



        res.status(200).json(token)
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor, tente novamente mais tarde." })
    }


})



export default router

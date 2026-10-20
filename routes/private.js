import express from "express"
import bcrypt from "bcrypt"
import { PrismaClient } from "../generated/prisma/client.ts"

const router = express.Router()
const prisma = new PrismaClient()

router.get('/listUser', async (req, res) => {
    try {
        const users = await prisma.user.findMany({ omit: { password: true } })
        res.status(200).json({ message: "Usuários listados com sucesso", users })
    } catch {
        res.status(500).json({ message: "Error no servidor, tente novamente mais tarde" })
    }
})

router.get('/user/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            omit: { password: true }
        })
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" })
        }

        res.status(200).json(user)
    } catch {
        res.status(500).json({ message: "Error no servidor, tente novamente mais tarde" })
    }
})

router.put('/user/:id', async (req, res) => {
    try {
        const { name, email, age, password } = req.body

        const user = await prisma.user.findUnique({ where: { id: req.params.id } })
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" })
        }

        const data = { name, email, age }
        if (password) {
            data.password = await bcrypt.hash(password, 10)
        }

        const userDB = await prisma.user.update({
            where: { id: req.params.id },
            data,
            omit: { password: true }
        })

        res.status(200).json({ message: "Usuário atualizado com sucesso", user: userDB })
    } catch {
        res.status(500).json({ message: "Error no servidor, tente novamente mais tarde" })
    }
})

router.delete('/user/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } })
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" })
        }

        await prisma.user.delete({ where: { id: req.params.id } })

        res.status(200).json({ message: "Usuário deletado com sucesso" })
    } catch {
        res.status(500).json({ message: "Error no servidor, tente novamente mais tarde" })
    }
})

export default router
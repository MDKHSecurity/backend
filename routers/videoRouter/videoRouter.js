import {Router} from "express"

const router = Router();

router.get("/api/video", async (req, res) => {
        res.status(200).send({message :"helloworld"})
})

export default router;
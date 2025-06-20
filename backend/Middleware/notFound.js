const notFound = (req, res) => {
    return res.status(404).json({ "msg": "Not found Dommage" });
};

module.exports = notFound;
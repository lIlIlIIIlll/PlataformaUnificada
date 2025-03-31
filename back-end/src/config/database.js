import { Sequelize } from "sequelize";

const SQ = new Sequelize({
    dialect:'sqlite',
    storage:'../../database.sqlite'
});

export default SQ;
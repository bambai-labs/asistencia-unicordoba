const { Op } = require("sequelize");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const COLOMBIA_TZ = "America/Bogota";

const { Evento } = require('../models/index');

const finalizarEventosWorker = async () => {
  try {
    const ahoraUTC = dayjs.utc().toDate();

    const [cantidad] = await Evento.update(
      { finalizado: true },
      {
        where: {
          fecha_hora_fin: { [Op.lt]: ahoraUTC },
          finalizado: false,
        }
      }
    );

    if (cantidad > 0) {
      const horaColombiaStr = dayjs()
        .tz(COLOMBIA_TZ)
        .format("DD/MM/YYYY HH:mm:ss");
      console.log(
        `✅ [${horaColombiaStr}] Finalizados ${cantidad} evento(s) automáticamente`
      );
    }
  } catch (error) {
    console.error("❌ Error en worker de finalización de eventos:", error);
  }
};

const iniciarWorker = () => {
  console.log("🤖 Worker de finalización de eventos iniciado (cada 60 segundos)");
  finalizarEventosWorker();
  setInterval(finalizarEventosWorker, 60000);
};

module.exports = { iniciarWorker, finalizarEventosWorker };
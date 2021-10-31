const express = require('express');
const axios = require('axios');
const TeleBot = require('telebot');

const app = express();
const port = 3000;

const { TELEGRAM_CHAT_ID: chatId, TELEGRAM_BOT_ID } = process.env;
console.log(`Env Variables: Telegram ${chatId} and botID ${TELEGRAM_BOT_ID}`);

const bot = new TeleBot({
  token: TELEGRAM_BOT_ID,
});

const getVaccinationDetailsByDate = (date) => {
  // District ID : 571 -> Chennai
  axios
    .get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=571&date=${date}`)
    .then((response) => {
      const vaccines = response.data;
      const sputnikVaccines = getSputnikVaccines(vaccines);
      // console.log('sputnikVaccines are ',sputnikVaccines);
      vaccinationDetails(sputnikVaccines);
    })
    .catch((error) => {
      console.log(error);
    });
};

const getSputnikVaccines = (vaccines) => {
  const sputnikCenters = [];
  vaccines.centers.forEach((center) => {
    const sputnikVaccineSessions = [];
    center.sessions.forEach((session) => {
      if (session.vaccine === 'SPUTNIK V') {
        sputnikVaccineSessions.push(session);
      }
    });
    if (sputnikVaccineSessions.length) {
      sputnikCenters.push({
        ...center,
        sessions: sputnikVaccineSessions,
      });
    }
  });
  return sputnikCenters;
};

const sendVaccinationNotification = ({date, name, doseType, capacity}) => {
  console.log(`Dose ${doseType} slots 🌟 : ${capacity} on ${date}\n`);
  bot.sendMessage(chatId, `💉 🚨🚨 Available on 🙂 ${date}`);
  bot.sendMessage(chatId, `🏥 Hospital Name : ${name}`);
  bot.sendMessage(chatId, `💉 Dose ${doseType} slots 🌟 : ${capacity} on ${date}\n`);
}

const vaccinationDetails = (sputnikVaccines) => {
  sputnikVaccines.forEach(({ name, sessions }) => {
    // bot.sendMessage(chatId,`🏥 Hospital Name : ${name}`);
    console.log(`********************* ${name} ***************************\n`);
    console.log(`Total slots ${sessions.length}\n`);

    let isAvailable = false;
    sessions.forEach(({ available_capacity, available_capacity_dose1, available_capacity_dose2, date }) => {
      if (available_capacity > 0) {
        isAvailable = !isAvailable && true;
        console.log(`Available on  ${date} dose 1 capacity ${available_capacity_dose1}, dose 2 capactiy ${available_capacity_dose2}`);

        const vaccinationDetails = {
          date,
          name,
          doseType: '',
          capacity: '',
        };

        /* if (available_capacity_dose1 > 0) {
          vaccinationDetails.doseType = '1';
          vaccinationDetails.capacity = available_capacity_dose1;
          sendVaccinationNotification(vaccinationDetails);
        } */
        if (available_capacity_dose2 > 0) {
          vaccinationDetails.doseType = '2';
          vaccinationDetails.capacity = available_capacity_dose2;
          sendVaccinationNotification(vaccinationDetails);
        }
      }
    });
    if (!isAvailable) {
      console.log(`No slots are available at 🏥 ${name} 😐 \n`);
      // bot.sendMessage(chatId,`No slots are available at ${name} 😐 \n`);
    }
    console.log('*****************************************************\n');
  });
};

const getVaccinationAvailability = () => {
  const dt = new Date();
  const today = dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear();
  console.log('Checking for date ', today);
  // bot.sendMessage(chatId,'🔎 Started Scanning For Sputnik Vaccination ...');
  getVaccinationDetailsByDate(today);
  console.log('🔴 Ended Scanning...');
  // bot.sendMessage(chatId,'🔴 Ended Scanning...');
};

app.get('/', (req, res) => {
  res.send('Welcome !');
});

app.listen(port, () => {
  // console.log(`Example app listening at http://localhost:${port}`)
  console.log('Vaccination notifier app started...\n');
  getVaccinationAvailability();
  setInterval(() => {
    getVaccinationAvailability();
  }, 300000); // 5 minutes
});

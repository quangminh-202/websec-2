const express = require('express');
const path = require('path');
const http = require('http');
const XMLHttpRequest = require('xhr2');
const HTMLParser = require('node-html-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.Server(app);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/rasp', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// API: расписание с ssau.ru
app.get('/api/rasp', (req, res) => {
    const query = new URLSearchParams(req.query).toString();
    const url = `https://ssau.ru/rasp?${query}`;
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = () => {
        if (request.readyState === 4) {
            const data = HTMLParser.parse(request.responseText);
            res.json(parseSchedule(data));
        }
    };
});

function parseSchedule(data) {
    const schedule = {
        dates: [],
        dayOfSchedule: [],
        Times: [],
        currentWeek: 31,
        color: [],
        currentGroup: ''
    };

    if (data.querySelector('.week-nav-current_week'))
        schedule.currentWeek = parseInt(data.querySelector('.week-nav-current_week').innerText);

    if (data.querySelector('.info-block__title'))
        schedule.currentGroup = data.querySelector('.info-block__title').innerText.trim();

    for (const cell of data.querySelectorAll('.schedule__time'))
        schedule.Times.push(cell.innerText.trim());

    for (const cell of data.querySelectorAll('.schedule__item')) {
        if (cell.querySelector('.schedule__head-weekday')) {
            schedule.dates.push(cell.innerText.trim());
        } else {
            if (cell.querySelector('.schedule__lesson')) {
                const subject = cell.querySelector('.schedule__discipline')?.innerText.trim() || '';
                const place = cell.querySelector('.schedule__place')?.innerText.trim() || '';

                if (cell.querySelector('.lesson-type-1__color'))      schedule.color.push('#a8f2a8');
                else if (cell.querySelector('.lesson-type-2__color')) schedule.color.push('#c9a8f2');
                else if (cell.querySelector('.lesson-type-3__color')) schedule.color.push('#a8c9f2');
                else if (cell.querySelector('.lesson-type-4__color')) schedule.color.push('#f4c7a8');
                else if (cell.querySelector('.lesson-type-5__color')) schedule.color.push('#f4e28c');
                else if (cell.querySelector('.lesson-type-6__color')) schedule.color.push('#b8f2f4');
                else schedule.color.push('#e0e0e0');

                const teacherEl = cell.querySelector('.schedule__teacher > .caption-text');
                const teacher = teacherEl
                    ? JSON.stringify({ name: teacherEl.innerText.trim(), link: teacherEl.getAttribute('href') })
                    : null;

                const groups = [];
                for (const g of cell.querySelectorAll('.schedule__group')) {
                    groups.push(JSON.stringify({ name: g.innerText.trim(), link: g.getAttribute('href') }));
                }

                schedule.dayOfSchedule.push({ subject, place, teacher, groups });
            } else {
                schedule.dayOfSchedule.push({ subject: null });
                schedule.color.push(null);
            }
        }
    }

    schedule.dayOfSchedule = schedule.dayOfSchedule.slice(1);
    schedule.color = schedule.color.slice(1);
    return schedule;
}

// API: список групп и преподавателей
app.get('/getGroupsAndTeachers', (req, res) => {
    const filePath = path.join(__dirname, 'ListGroupsTeachers.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.json({ groups: [], teachers: [] });
    }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

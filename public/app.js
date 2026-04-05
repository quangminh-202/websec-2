let currentPath = window.location.pathname + window.location.search;
let queryParams = new URLSearchParams(window.location.search);
let activeWeek = parseInt(queryParams.get('selectedWeek')) || 31;

$(document).ready(function () {
    fetchSchedule();
    loadGroupsAndTeachers();

    $('#previousWeek').on('click', previousWeek);
    $('#nextWeek').on('click', nextWeek);

    $('#downloadPdf').on('click', function (e) {
        e.preventDefault();
        downloadPDF();
    });

    // Dark mode
    if (localStorage.getItem('darkMode') === 'on') {
        $('body').addClass('dark');
        $('#darkModeToggle').text('🌙');
    } else {
        $('#darkModeToggle').text('☀️');
    }

    $('#darkModeToggle').on('click', function () {
        $('body').toggleClass('dark');
        const isDark = $('body').hasClass('dark');
        $(this).text(isDark ? '🌙' : '☀️');
        localStorage.setItem('darkMode', isDark ? 'on' : 'off');
    });
});

function fetchSchedule() {
    const apiUrl = '/api' + currentPath;
    $.getJSON(apiUrl)
        .done(function (data) {
            $('#previousWeek').toggle(data.currentWeek > 21);
            $('#nextWeek').toggle(data.currentWeek < 41);
            renderSchedule(data);
        })
        .fail(function (err) {
            console.error('Ошибка загрузки:', err);
        });
}

function renderSchedule(timetable) {
    activeWeek = parseInt(timetable.currentWeek);
    $('#currentWeek').text('Неделя ' + activeWeek);
    $('#currentGroup').text(timetable.currentGroup || 'Выберите группу или преподавателя');

    const $table = $('#schedule').empty();

    const $headerRow = $('<tr>').css('height', '70px');
    $headerRow.append($('<td>').css('width', '90px').text('Время'));
    $.each(timetable.dates, function (_, date) {
        const parts = date.split(' ');
        const $cell = $('<td>').css('width', '220px');
        $cell.append(document.createTextNode(parts[0] || ''));
        $cell.append($('<br>'));
        $cell.append(document.createTextNode(parts[1] || ''));
        $headerRow.append($cell);
    });
    $table.append($headerRow);

    for (let i = 0; i < timetable.Times.length; i++) {
        const $row = $('<tr>');
        $row.append($('<td>').addClass('time-cell').text(timetable.Times[i]));

        for (let j = 0; j < timetable.dates.length; j++) {
            const idx = 6 * i + j;
            const lesson = timetable.dayOfSchedule[idx];
            const $cell = $('<td>');

            if (lesson && lesson.subject) {
                const $subjectTitle = $('<h4>').text(lesson.subject).css('color', timetable.color[idx] || '#333');
                $cell.append($subjectTitle);
                $cell.append(document.createTextNode(lesson.place || ''));
                $cell.append($('<br>'));

                $.each(lesson.groups, function (_, g) {
                    const groupInfo = JSON.parse(g);
                    $cell.append($('<a>').text(groupInfo.name).attr('href', groupInfo.link));
                    $cell.append($('<br>'));
                });

                if (lesson.teacher) {
                    const teacherInfo = JSON.parse(lesson.teacher);
                    $cell.append($('<a>').text(teacherInfo.name).attr('href', teacherInfo.link));
                    $cell.append($('<br>'));
                }
                $cell.append($('<br>'));
            }
            $row.append($cell);
        }
        $table.append($row);
    }
}

function previousWeek() {
    if (activeWeek <= 21) return;
    activeWeek--;
    updateWeekUrl();
}

function nextWeek() {
    if (activeWeek >= 41) return;
    activeWeek++;
    updateWeekUrl();
}

function updateWeekUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set('selectedWeek', activeWeek);
    currentPath = (window.location.pathname || '/rasp') + '?' + params.toString();
    location.assign(currentPath);
}

function loadGroupsAndTeachers() {
    $.getJSON('/getGroupsAndTeachers')
        .done(function (catalog) {
            const $datalist = $('#selectGroups').empty();

            $.each(catalog.groups, function (_, g) {
                $datalist.append($('<option>').val(g.name.trim()));
            });
            $.each(catalog.teachers, function (_, t) {
                $datalist.append($('<option>').val(t.name.trim()));
            });

            $('#inputTextGroup').on('change', function () {
                const searchVal = $(this).val().trim();

                const matchedGroup = catalog.groups.find(g => g.name.trim() === searchVal);
                if (matchedGroup) { currentPath = matchedGroup.link; location.assign(currentPath); return; }

                const matchedTeacher = catalog.teachers.find(t => t.name.trim() === searchVal);
                if (matchedTeacher) { currentPath = matchedTeacher.link; location.assign(currentPath); }
            });
        });
}

function downloadPDF() {
    const title = $('#currentGroup').text() || 'Расписание';
    const week = $('#currentWeek').text();

    if (!$('#schedule tr').length) {
        alert('Сначала загрузите расписание!');
        return;
    }

    // Клонируем таблицу для PDF
    const $clone = $('<div>').css({ padding: '20px', fontFamily: 'Arial, sans-serif' });
    $clone.append($('<h3>').css({ marginBottom: '5px' }).text(title));
    $clone.append($('<p>').css({ marginBottom: '15px', color: '#555' }).text(week));
    $clone.append($('#schedule').clone().css({ width: '100%', borderCollapse: 'collapse' }));

    // Стили для таблицы в PDF
    $clone.find('td').css({ border: '1px solid #ccc', padding: '5px', fontSize: '10px' });
    $clone.find('tr:first-child td').css({ background: '#003d99', color: 'white', fontWeight: 'bold' });

    html2pdf()
        .set({
            margin: 10,
            filename: `${title} - ${week}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        })
        .from($clone[0])
        .save();
}

// calendar.js - Calendar functionality
import { formatDate, formatTime } from './utils.js';
import { RESULT_TYPES, getResultsByDateRange } from './results.js';
import { GAME_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: async function(info, successCallback, failureCallback) {
            try {
                const [twoDResults, threeDResults] = await Promise.all([
                    getResultsByDateRange(RESULT_TYPES.TWO_D, info.start, info.end),
                    getResultsByDateRange(RESULT_TYPES.THREE_D, info.start, info.end)
                ]);

                const events = [];

                // Add 2D results
                twoDResults.forEach(result => {
                    GAME_CONFIG['2D'].drawTimes.forEach(time => {
                        events.push({
                            title: `2D: ${result.number}`,
                            start: `${result.date}T${time}`,
                            backgroundColor: '#0d6efd',
                            extendedProps: {
                                type: '2D',
                                number: result.number,
                                time: time
                            }
                        });
                    });
                });

                // Add 3D results
                threeDResults.forEach(result => {
                    events.push({
                        title: `3D: ${result.number}`,
                        start: result.date,
                        backgroundColor: '#198754',
                        extendedProps: {
                            type: '3D',
                            number: result.number
                        }
                    });
                });

                successCallback(events);
            } catch (error) {
                console.error('Error loading calendar events:', error);
                failureCallback(error);
            }
        },
        eventClick: function(info) {
            const event = info.event;
            const props = event.extendedProps;
            
            let content = `
                <div class="modal-header">
                    <h5 class="modal-title">${props.type} Result Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Date:</strong> ${formatDate(event.start)}</p>
                    <p><strong>Number:</strong> ${props.number}</p>
            `;

            if (props.type === '2D') {
                content += `<p><strong>Time:</strong> ${formatTime(props.time)}</p>`;
            }

            content += '</div>';

            const modal = new bootstrap.Modal(document.getElementById('eventModal'));
            document.querySelector('#eventModal .modal-content').innerHTML = content;
            modal.show();
        }
    });

    calendar.render();
});

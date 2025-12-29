export const calendarStyles = `
  .fc {
    font-family: 'Inter', sans-serif !important;
  }

  .fc .fc-toolbar {
    padding: 14px 18px !important;
    border-radius: 16px !important;
    background: linear-gradient(to right, #ffffffaa, #fafafaaa) !important;
    backdrop-filter: blur(8px) !important;
    margin-bottom: 14px !important;
  }

  .fc .fc-toolbar-title {
    font-size: 1.4rem !important;
    font-weight: 700 !important;
    color: #1e1e1e !important;
  }

  .fc-button {
    border-radius: 12px !important;
    background: #4f46e5 !important;
    border: none !important;
    color: white !important;
    padding: 6px 14px !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    transition: all .2s ease-in-out !important;
  }

  .fc-button:hover {
    background: #4338ca !important;
    transform: translateY(-2px);
  }

  .fc-event {
    border: none !important;
    border-radius: 12px !important;
    padding: 8px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    background: linear-gradient(135deg, #5b21b6, #4c1d95) !important;
    color: white !important;
    box-shadow: 0 6px 14px rgba(0,0,0,0.25) !important;
    transition: all 0.18s ease-in-out !important;
  }

  .fc-event:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 18px rgba(0,0,0,0.32) !important;
  }

  .fc-timegrid-slot {
    height: 60px !important;
  }

  .fc-today {
    background: rgba(99,102,241,0.08) !important;
  }

  /* MOBILE VIEW IMPROVED */
  @media(max-width: 640px) {
    .fc .fc-toolbar-title {
      font-size: 1.1rem !important;
    }

    .fc-event {
      font-size: 0.85rem !important;
      padding: 10px !important;
    }

    .fc-timegrid-slot {
      height: 72px !important;
    }
  }
`;
import { supabase } from '../lib/supabase.js';

export const getEmployeeCalendarColors = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', org.id);

    if (employeesError) throw employeesError;

    const employeeIds = (employees || []).map((emp) => emp.id);

    if (!employeeIds.length) {
      return res.json([]);
    }

    const { data: employeeColors, error: colorsError } = await supabase
      .from('employee_calendar_color')
      .select('employee_id, calendar_color_id')
      .in('employee_id', employeeIds);

    if (colorsError) throw colorsError;

    const colorIds = [...new Set((employeeColors || [])
      .map((c) => c.calendar_color_id)
      .filter(Boolean))];

    let colorsMap = {};
    if (colorIds.length) {
      const { data: colors, error: colorsErr } = await supabase
        .from('google_calendar_colors')
        .select('calendar_color_id, google_color_hex')
        .in('calendar_color_id', colorIds);

      if (colorsErr) throw colorsErr;

      colorsMap = (colors || []).reduce((acc, color) => {
        acc[color.calendar_color_id] = color.google_color_hex || '#000000';
        return acc;
      }, {});
    }

    const formatted = (employeeColors || []).map((item) => ({
      employee_id: item.employee_id,
      calendar_color_id: item.calendar_color_id,
      hex_color: colorsMap[item.calendar_color_id] || null,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching employee calendar colors:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

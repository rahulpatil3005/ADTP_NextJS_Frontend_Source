'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';

interface WeeklyTrendPoint {
  session_date: string;
  present: number;
  absent: number;
  avg_percentage: number;
}

export function WeeklyAttendanceChart({ data }: { data: WeeklyTrendPoint[] }) {
  const chartData = data.map((d) => ({
    day: formatDate(d.session_date, { weekday: 'short' }),
    Present: Number(d.present),
    Absent: Number(d.absent),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0DFD8" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#666666' }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#666666' }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8, border: '1px solid #E0DFD8',
                fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Present" fill="#534AB7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

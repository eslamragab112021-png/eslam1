import { useState, useEffect } from 'react';
import { MapPin, Clock, Coffee, LogIn, LogOut, CheckCircle, Navigation } from 'lucide-react';
import { useStore } from '../../store';
import { clockIn, clockOut, startBreak, endBreak } from '../../engine/attendance';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatTime, formatMinutes } from '../../utils/format';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { haversineDistance } from '../../engine/attendance';
import type { BreakEntry } from '../../db/schema';
import toast from 'react-hot-toast';

interface GeoState {
  lat?: number;
  lng?: number;
  accuracy?: number;
  error?: string;
  loading: boolean;
  distanceToOffice?: number;
  withinRadius: boolean;
}

export function ClockView() {
  const { currentEmployee, employees, todayRecord, locations, shifts, loadTodayRecord, loadTodayRecords, addNotification } = useStore();
  const [geo, setGeo] = useState<GeoState>({ loading: false, withinRadius: false });
  const [clocking, setClocking] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(currentEmployee?.id || '');

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (todayRecord?.clockInTime && !todayRecord.clockOutTime) {
      const t = setInterval(() => {
        const mins = differenceInMinutes(new Date(), parseISO(todayRecord.clockInTime!));
        setElapsed(mins);
      }, 10000);
      setElapsed(differenceInMinutes(new Date(), parseISO(todayRecord.clockInTime)));
      return () => clearInterval(t);
    }
  }, [todayRecord]);

  useEffect(() => {
    if (selectedEmployee) loadTodayRecord(selectedEmployee);
  }, [selectedEmployee]);

  const emp = employees.find((e) => e.id === selectedEmployee) || currentEmployee;
  const shift = shifts.find((s) => s.id === emp?.shiftId);
  const location = locations.find((l) => l.id === emp?.workLocationId);
  const openBreak = todayRecord?.breaks.find((b: BreakEntry) => !b.endTime);

  const getGPS = async (): Promise<{ lat: number; lng: number } | null> => {
    setGeo((g) => ({ ...g, loading: true, error: undefined }));
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGeo({ loading: false, withinRadius: false, error: 'Geolocation not supported' });
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          let distanceToOffice: number | undefined;
          let withinRadius = false;
          if (location) {
            distanceToOffice = Math.round(haversineDistance(lat, lng, location.latitude, location.longitude));
            withinRadius = distanceToOffice <= location.radiusMeters;
          }
          setGeo({ lat, lng, accuracy, loading: false, distanceToOffice, withinRadius });
          resolve({ lat, lng });
        },
        (err) => {
          setGeo({ loading: false, withinRadius: false, error: err.message });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!emp) return toast.error('Select an employee first');
    setClocking(true);
    try {
      const pos = await getGPS();
      const result = await clockIn(emp.id, pos?.lat, pos?.lng, !pos);
      await loadTodayRecord(emp.id);
      await loadTodayRecords();
      const msg = result.geoValid
        ? `✅ Clocked in at ${format(new Date(), 'HH:mm')}${result.record.latenessMinutes > 0 ? ` — ${result.record.latenessMinutes}min late` : ''}`
        : `⚠️ Clocked in (outside geofence, ${result.distance}m away)`;
      toast.success(msg, { duration: 4000 });
      addNotification({ title: 'Clock In', message: msg, type: result.geoValid ? 'success' : 'warning', read: false, employeeId: emp.id });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!emp) return;
    setClocking(true);
    try {
      const pos = await getGPS();
      const result = await clockOut(emp.id, pos?.lat, pos?.lng, !pos);
      await loadTodayRecord(emp.id);
      await loadTodayRecords();
      const netMin = result.record.netWorkingMinutes;
      toast.success(`✅ Clocked out — Net: ${formatMinutes(netMin)}${result.record.overtimeMinutes > 0 ? `, OT: ${formatMinutes(result.record.overtimeMinutes)}` : ''}`, { duration: 5000 });
      addNotification({ title: 'Clock Out', message: `Clocked out at ${format(new Date(), 'HH:mm')}. Net: ${formatMinutes(netMin)}`, type: 'success', read: false, employeeId: emp.id });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setClocking(false);
    }
  };

  const handleBreakStart = async (type: BreakEntry['type']) => {
    if (!emp) return;
    try {
      await startBreak(emp.id, type);
      await loadTodayRecord(emp.id);
      toast.success(`Break started`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBreakEnd = async () => {
    if (!emp) return;
    try {
      await endBreak(emp.id);
      await loadTodayRecord(emp.id);
      toast.success('Break ended');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const clocked = !!todayRecord?.clockInTime;
  const clockedOut = !!todayRecord?.clockOutTime;
  const onBreak = !!openBreak;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Employee Selector */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {emp?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
          </div>
          <div className="flex-1">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="text-base font-semibold text-gray-900 bg-transparent border-none outline-none w-full cursor-pointer"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
              ))}
            </select>
            <div className="text-sm text-gray-500">{emp?.designation} · {emp?.department}</div>
          </div>
          {todayRecord && <Badge status={todayRecord.status} />}
        </CardBody>
      </Card>

      {/* Clock Display */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center text-white">
        <div className="text-6xl font-mono font-bold tracking-tight">
          {format(liveTime, 'HH:mm:ss')}
        </div>
        <div className="text-gray-400 mt-1">{format(liveTime, 'EEEE, dd MMMM yyyy')}</div>

        {shift && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <Clock size={14} />
            <span className="text-sm">{shift.name}: {shift.startTime} – {shift.endTime}</span>
          </div>
        )}

        {clocked && !clockedOut && (
          <div className="mt-4 bg-emerald-500/20 rounded-xl px-4 py-3 inline-block">
            <div className="text-emerald-300 text-xs font-medium">Working Time</div>
            <div className="text-2xl font-bold text-emerald-300 font-mono mt-0.5">
              {formatMinutes(elapsed - (todayRecord?.totalBreakMinutes || 0))}
            </div>
            {todayRecord && todayRecord.totalBreakMinutes > 0 && (
              <div className="text-xs text-emerald-400 mt-0.5">
                Break: {formatMinutes(todayRecord.totalBreakMinutes)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GPS Status */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${geo.withinRadius ? 'bg-emerald-100' : geo.lat ? 'bg-red-100' : 'bg-gray-100'}`}>
                <MapPin size={18} className={geo.withinRadius ? 'text-emerald-600' : geo.lat ? 'text-red-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {geo.loading ? 'Getting location…' :
                    geo.error ? 'GPS Error' :
                    geo.lat ? (geo.withinRadius ? '✓ Within geofence' : '✗ Outside geofence') :
                    'Location not obtained yet'}
                </div>
                <div className="text-xs text-gray-500">
                  {location?.name || 'No work location set'}
                  {geo.distanceToOffice !== undefined && ` · ${geo.distanceToOffice}m away (radius: ${location?.radiusMeters}m)`}
                </div>
                {geo.lat && (
                  <div className="text-xs text-gray-400 font-mono">
                    {geo.lat.toFixed(6)}, {geo.lng!.toFixed(6)} (±{geo.accuracy?.toFixed(0)}m)
                  </div>
                )}
                {geo.error && <div className="text-xs text-red-500">{geo.error}</div>}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={getGPS} loading={geo.loading}>
              <Navigation size={14} />
              Get GPS
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-4">
        {!clocked && (
          <Button
            variant="success"
            size="lg"
            onClick={handleClockIn}
            loading={clocking}
            className="w-full py-4 text-lg justify-center"
          >
            <LogIn size={22} />
            Clock In
          </Button>
        )}

        {clocked && !clockedOut && (
          <>
            {!onBreak ? (
              <div className="grid grid-cols-3 gap-3">
                {(['lunch', 'tea', 'personal'] as BreakEntry['type'][]).map((type) => (
                  <Button
                    key={type}
                    variant="secondary"
                    onClick={() => handleBreakStart(type)}
                    className="justify-center py-3"
                  >
                    <Coffee size={16} />
                    {type.charAt(0).toUpperCase() + type.slice(1)} Break
                  </Button>
                ))}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-amber-800">On Break</div>
                  <div className="text-sm text-amber-600">
                    {openBreak.type} break started at {formatTime(openBreak.startTime)}
                  </div>
                </div>
                <Button variant="warning" onClick={handleBreakEnd}>End Break</Button>
              </div>
            )}

            <Button
              variant="danger"
              size="lg"
              onClick={handleClockOut}
              loading={clocking}
              className="w-full py-4 text-lg justify-center"
              disabled={onBreak}
            >
              <LogOut size={22} />
              Clock Out
            </Button>
          </>
        )}

        {clockedOut && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-emerald-800 text-lg">Shift Complete</div>
            <div className="text-sm text-emerald-600 mt-1">
              {formatTime(todayRecord?.clockInTime)} – {formatTime(todayRecord?.clockOutTime)}
            </div>
          </div>
        )}
      </div>

      {/* Today Summary */}
      {todayRecord && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Today's Summary</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Clock In', value: formatTime(todayRecord.clockInTime) },
                { label: 'Clock Out', value: formatTime(todayRecord.clockOutTime) },
                { label: 'Net Work', value: formatMinutes(todayRecord.netWorkingMinutes) },
                { label: 'Overtime', value: formatMinutes(todayRecord.overtimeMinutes) },
                { label: 'Lateness', value: formatMinutes(todayRecord.latenessMinutes) },
                { label: 'Break Time', value: formatMinutes(todayRecord.totalBreakMinutes) },
                { label: 'Status', value: <Badge status={todayRecord.status} /> },
                { label: 'Geo Check', value: <span className={todayRecord.clockInLocationValid ? 'text-emerald-600 font-semibold text-sm' : 'text-red-600 font-semibold text-sm'}>{todayRecord.clockInLocationValid ? '✓ Valid' : '✗ Invalid'}</span> },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="font-bold text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Break Log */}
            {todayRecord.breaks.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Break Log</div>
                <div className="space-y-1.5">
                  {todayRecord.breaks.map((b: BreakEntry) => (
                    <div key={b.id} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <Coffee size={14} className="text-gray-400" />
                      <span className="text-gray-600 capitalize">{b.type}</span>
                      <span className="text-gray-400">{formatTime(b.startTime)} – {b.endTime ? formatTime(b.endTime) : 'ongoing'}</span>
                      {b.durationMinutes > 0 && (
                        <span className="ml-auto text-gray-700 font-medium">{formatMinutes(b.durationMinutes)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

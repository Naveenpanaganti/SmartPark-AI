import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QrCode, ArrowLeft, Printer, Download, Car, Bike, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function QRPage() {
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function getBookingDetail() {
      try {
        setLoading(true);
        let idToFetch = bookingId;

        // If no booking ID is provided in query params, fetch the latest active/upcoming reservation
        if (!idToFetch) {
          const res = await fetch(`${API_BASE}/bookings/my`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if (res.ok) {
            const list = await res.json();
            const active = list.filter(b => b.status === 'booked' || b.status === 'checked-in');
            if (active.length > 0) {
              idToFetch = active[0].id;
            }
          }
        }

        if (!idToFetch) {
          setBooking(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/bookings/${idToFetch}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to load booking details');
        const data = await res.json();
        setBooking(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    getBookingDetail();
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
        <p className="text-lg">Generating QR code pass...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-950/20 border border-red-800/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-200 mb-2">Failed to Load QR Pass</h3>
        <p className="text-red-400 mb-6">{error}</p>
        <Link to="/customer/bookings" className="px-5 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-medium rounded-xl transition inline-block text-sm">
          Go back to Bookings
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16 bg-gray-900/20 border border-gray-900 border-dashed rounded-3xl p-8 max-w-xl mx-auto my-8">
        <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Active Booking Found</h3>
        <p className="text-sm text-gray-400 mb-8">
          You must book a parking slot to generate a QR Pass.
        </p>
        <Link to="/customer/parking" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl transition inline-block text-sm">
          Book a Slot Now
        </Link>
      </div>
    );
  }

  // Construct QR Payload
  const qrPayload = JSON.stringify({
    bookingId: booking.id,
    userName: booking.user_name,
    slotNumber: booking.slot_number,
    floorLevel: booking.floor_level,
    status: booking.status
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}&color=059669&bgcolor=030712`;

  return (
    <div className="space-y-6 max-w-md mx-auto print:bg-white print:text-black">
      {/* Back button */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 print:hidden">
        <Link to="/customer/bookings" className="flex items-center text-sm font-semibold text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Link>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-xl text-gray-400 hover:text-white transition"
            title="Print Pass"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert('PDF generation simulated. In a production build, this downloads an encrypted digital receipt.')}
            className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-xl text-gray-400 hover:text-white transition"
            title="Download Ticket"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ticket Container */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Ticket Top header decoration */}
        <div className="bg-emerald-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-950">
            <QrCode className="w-5 h-5 font-bold" />
            <span className="font-extrabold tracking-wider text-xs uppercase">ParkSmart QR Pass</span>
          </div>
          {booking.is_premium && (
            <span className="flex items-center text-[10px] font-extrabold bg-gray-950 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 mr-0.5" />
              VIP
            </span>
          )}
        </div>

        {/* QR Code section */}
        <div className="bg-gray-950 p-8 flex flex-col items-center border-b border-dashed border-gray-800 relative">
          {/* Half circles mock ticket punch */}
          <div className="absolute -left-3 bottom-0 w-6 h-6 bg-gray-950 rounded-full border border-gray-800 translate-y-1/2 hidden md:block" />
          <div className="absolute -right-3 bottom-0 w-6 h-6 bg-gray-950 rounded-full border border-gray-800 translate-y-1/2 hidden md:block" />
          
          <div className="bg-gray-950 p-4 border border-emerald-500/20 rounded-2xl shadow-inner shadow-emerald-500/5 mb-4">
            <img
              src={qrImageUrl}
              alt="Booking QR Code"
              className="w-48 h-48 rounded-lg"
            />
          </div>
          <p className="text-xs text-gray-500 select-all font-mono">PASS-ID: #{booking.id}-{booking.slot_number}</p>
        </div>

        {/* Details section */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Customer</p>
              <p className="text-sm font-semibold text-white mt-0.5 truncate">{booking.user_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Slot Number</p>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5 flex items-center">
                {booking.vehicle_type === 'car' ? <Car className="w-3.5 h-3.5 mr-1" /> : <Bike className="w-3.5 h-3.5 mr-1" />}
                Slot {booking.slot_number}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Floor Level</p>
              <p className="text-sm font-semibold text-white mt-0.5">{booking.floor_level}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</p>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border mt-1 ${
                booking.status === 'checked-in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {booking.status || 'booked'}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-800/60 pt-4 space-y-2 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> Start time</span>
              <span className="text-gray-200 font-semibold">{new Date(booking.start_time).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> End time</span>
              <span className="text-gray-200 font-semibold">{new Date(booking.end_time).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Instructions Footer */}
        <div className="bg-gray-900/80 px-6 py-4 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-400">
            Present this QR Code to the gate security officer upon entry and exit. Contact digital Twin control room if scan encounters a system collision.
          </p>
        </div>
      </div>
    </div>
  );
}

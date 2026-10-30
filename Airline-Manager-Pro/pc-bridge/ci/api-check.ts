// Compiled on the build machine only: fails the build if node-simconnect's API differs
// from what src/sim.ts uses.
import { open, Protocol, SimConnectDataType, SimConnectConstants, SimConnectPeriod, FacilityListType } from 'node-simconnect';

async function check() {
  const { recvOpen, handle } = await open('check', Protocol.KittyHawk);
  void Protocol.FSX_SP2; void Protocol.SunRise; void recvOpen.applicationName; void recvOpen.applicationVersionMinor; void recvOpen.simConnectVersionMajor; void recvOpen.simConnectBuildMinor;
  handle.addToDataDefinition(1, 'PLANE LATITUDE', 'degrees', SimConnectDataType.FLOAT64);
  handle.addToDataDefinition(1, 'TITLE', null, SimConnectDataType.STRING256);
  handle.addToDataDefinition(1, 'ATC ID', null, SimConnectDataType.STRING32);
  handle.addToDataDefinition(1, 'PAYLOAD STATION NAME:1', null, SimConnectDataType.STRING64);
  handle.requestDataOnSimObject(1, 1, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SIM_FRAME, 0, 0, 5);
  handle.requestDataOnSimObject(2, 1, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND);
  handle.subscribeToSystemEvent(1, 'Crashed');
  handle.requestFacilitiesList(FacilityListType.AIRPORT, 10);
  handle.on('simObjectData', r => { const d = r.data; d.readFloat64(); d.readString256(); d.readString32(); d.readString64(); void r.requestID; });
  handle.on('event', e => { void e.clientEventId; void e.data; });
  handle.on('airportList', r => { r.airports.forEach(a => { void a.icao; void a.latitude; void a.longitude; }); });
  handle.on('quit', () => {}); handle.on('close', () => {}); handle.on('exception', x => { void x.exception; void x.sendId; void x.index; void x.exceptionName; });
  handle.close();
}
void check;

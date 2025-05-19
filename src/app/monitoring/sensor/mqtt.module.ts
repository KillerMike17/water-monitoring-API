import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';

export const MQTT_SERVICE = 'MQTT_SERVICE';

@Module({
  providers: [
    {
      provide: MQTT_SERVICE,
      useFactory: (): ClientProxy => {
        return ClientProxyFactory.create({
          transport: Transport.MQTT,
          options: {
            url: 'mqtts://f54dfe3938d04e29930a0c7e39926c8a.s1.eu.hivemq.cloud:8883', // change if using a remote broker
            username: 'mikias',
            password: 'Mayy@1234',
          },
        });
      },
    },
  ],
  exports: [MQTT_SERVICE],
})
export class MqttModule {}

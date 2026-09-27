import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register as registerUser, clearError } from '@/store/slices/authSlice';
import { Button, Input, Alert } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^\+?\d{7,15}$/, 'Please enter a valid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: z.string(),
  role: z.enum(['customer', 'technician']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      // Links from the home page and the WhatsApp JOIN reply use ?role=technician
      role: searchParams.get('role') === 'technician' ? 'technician' : 'customer',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword, ...userData } = data;
    const result = await dispatch(registerUser(userData));
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-start justify-center px-4 py-6 sm:py-14">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl font-bold">Create Your Dumuwaks Account</CardTitle>
          <CardDescription className="text-center">
            Join Kenya's trusted platform for professional maintenance and repair services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert
                variant="error"
                message={error}
                onClose={() => dispatch(clearError())}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
                {...register('firstName')}
              />

              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1234567890"
              error={errors.phoneNumber?.message}
              helperText="Enter your phone number with country code (e.g., +1234567890)"
              {...register('phoneNumber')}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-muted">
                I am a<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex cursor-pointer items-center rounded-lg border-2 border-line-strong p-3 hover:border-primary-500">
                  <input
                    type="radio"
                    value="customer"
                    {...register('role')}
                    className="mr-2 h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm font-medium">Customer</span>
                </label>
                <label className="flex cursor-pointer items-center rounded-lg border-2 border-line-strong p-3 hover:border-primary-500">
                  <input
                    type="radio"
                    value="technician"
                    {...register('role')}
                    className="mr-2 h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm font-medium">Technician</span>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              helperText="At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special (@$!%*?&)"
              {...register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="text-sm text-ink-muted">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-primary-600 hover:text-primary-700">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                Privacy Policy
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </Button>

            <div className="text-center text-sm text-ink-muted">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
